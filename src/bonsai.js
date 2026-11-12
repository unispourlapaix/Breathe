/* ============================================
   MOD-BONSAI-001 : Bonsaï génératif
   7 essences, silhouette tronc/branches fixe par espèce,
   feuilles générées par code, apparition progressive (1 par niveau, jusqu'à 888)
   ============================================ */

const Bonsai = (() => {

  const LEVELS_PER_TREE = 888;
  const LEAF_COUNT = 88; // nombre de "vraies" feuilles distinctes sur l'arbre complet
  const LEVELS_PER_LEAF = LEVELS_PER_TREE / LEAF_COUNT; // ≈ 10.09 niveaux par feuille

  // Convertit un niveau (0..888) en nombre de feuilles visibles (0..88)
  function levelToLeafCount(level) {
    const clamped = Math.min(LEVELS_PER_TREE, Math.max(0, level));
    return Math.min(LEAF_COUNT, Math.ceil(clamped / LEVELS_PER_LEAF));
  }

  const SPECIES = [
    {
      id: "SP-erable",
      name: "Érable sacré",
      nameJp: "Momiji",
      leafColor: ["#c44b3a", "#d9663f", "#e8853f"], // rouge-orange automnal
      leafShape: "maple",
      trunkColor: "#5a4030",
      pot: { shape: "rect", color: "#5a3a2e", colorLight: "#7a5242" },
      gameTheme: "moonlit"
    },
    {
      id: "SP-pin",
      name: "Pin noir du Japon",
      nameJp: "Kuromatsu",
      leafColor: ["#3a4a32", "#4a5a3a", "#2f3d28"],
      leafShape: "needle",
      trunkColor: "#3a2e22",
      pot: { shape: "rect", color: "#2e3a36", colorLight: "#46584f" },
      gameTheme: "mountain"
    },
    {
      id: "SP-cerisier",
      name: "Cerisier",
      nameJp: "Sakura",
      leafColor: ["#f3c5d4", "#f7d4e0", "#eeb3c8"],
      leafShape: "blossom",
      trunkColor: "#4a3a30",
      pot: { shape: "oval", color: "#e8dcc8", colorLight: "#f5ecdc" },
      gameTheme: "day"
    },
    {
      id: "SP-genevrier",
      name: "Genévrier",
      nameJp: "Shimpaku",
      leafColor: ["#7a9a8a", "#8aab9a", "#6a8a7a"],
      leafShape: "cascade",
      trunkColor: "#6a5040",
      pot: { shape: "round", color: "#7a6048", colorLight: "#95795a" },
      gameTheme: "oasis"
    },
    {
      id: "SP-orme",
      name: "Orme de Chine",
      nameJp: "Nire",
      leafColor: ["#8fae6a", "#9fbe7a", "#7f9e5a"],
      leafShape: "round",
      trunkColor: "#5a4838",
      pot: { shape: "rect", color: "#8a7050", colorLight: "#a8895f" },
      gameTheme: "rain"
    },
    {
      id: "SP-azalee",
      name: "Azalée",
      nameJp: "Satsuki",
      leafColor: ["#e85a7a", "#f06a8a", "#d84a6a"],
      leafShape: "azalea",
      trunkColor: "#4a3828",
      pot: { shape: "oval", color: "#3a3a42", colorLight: "#54545e" },
      gameTheme: "day"
    },
    {
      id: "SP-if",
      name: "If",
      nameJp: "Kusamaki",
      leafColor: ["#2f4a3a", "#3a5a45", "#27402f"],
      leafShape: "yew",
      trunkColor: "#4a3a2a",
      pot: { shape: "round", color: "#4a4038", colorLight: "#665a4e" },
      gameTheme: "snow"
    }
  ];

  function getSpecies(index) {
    return SPECIES[index % SPECIES.length];
  }

  function getTotalSpecies() { return SPECIES.length; }

  // ---- RNG stable seedé (mêmes feuilles à chaque rendu pour un même arbre) ----
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Silhouette du tronc et des branches (fixe par espèce, via seed dérivé de speciesIndex) ----
  // Retourne une liste de branches : chacune un segment {x1,y1,x2,y2,width} en coordonnées relatives (-100..100, 0 en bas)
  function buildSkeleton(speciesIndex) {
    const rand = mulberry32(1000 + speciesIndex * 37);
    const branches = [];

    // tronc principal, légèrement courbé façon bonsaï
    const trunkBend = (rand() - 0.5) * 30;
    const trunkBend2 = trunkBend * 0.3 + (rand() - 0.5) * 14;
    branches.push(makeCurvedBranch(0, 0, trunkBend * 0.3, -45, 9, true, rand));
    branches.push(makeCurvedBranch(trunkBend * 0.3, -45, trunkBend, -80, 6, true, rand));

    // branches secondaires partant du tronc à différentes hauteurs
    const branchCount = 5 + Math.floor(rand() * 3);
    const leafClusters = []; // positions où les feuilles apparaissent, ancrées au bout de chaque branche

    for (let i = 0; i < branchCount; i++) {
      const t = 0.25 + (i / branchCount) * 0.7 + rand() * 0.08;
      const baseX = trunkBend * t;
      const baseY = -45 * Math.min(1, t * 1.6) - (t > 0.55 ? (t - 0.55) * 80 : 0);
      const dir = i % 2 === 0 ? 1 : -1;
      const length = 22 + rand() * 18;
      const angle = (-0.3 - rand() * 0.5) * dir;
      const endX = baseX + Math.cos(angle) * length * dir;
      const endY = baseY - Math.sin(Math.abs(angle)) * length * 0.5 - length * 0.3;

      const branch = makeCurvedBranch(baseX, baseY, endX, endY, 3 + rand() * 2, false, rand);
      branches.push(branch);

      // le cluster est centré directement sur la VRAIE pointe de la branche courbée,
      // orienté selon la tangente réelle de la courbe à son extrémité (pas le segment droit théorique)
      const tip = quadPoint(branch.x1, branch.y1, branch.cx, branch.cy, branch.x2, branch.y2, 1);
      const tangent = quadTangent(branch.x1, branch.y1, branch.cx, branch.cy, branch.x2, branch.y2, 1);
      const tanLen = Math.hypot(tangent.x, tangent.y) || 1;
      const normX = tangent.x / tanLen;
      const normY = tangent.y / tanLen;
      const clusterRadius = 6.5 + rand() * 5;
      leafClusters.push({
        x: tip.x,
        y: tip.y,
        radius: clusterRadius,
        anchorX: tip.x,
        anchorY: tip.y,
        dirAngle: Math.atan2(normY, normX)
      });
    }

    // bouquet de feuillage au sommet, centré directement sur la pointe réelle du tronc (après courbure)
    const trunkTip = quadPoint(
      branches[1].x1, branches[1].y1, branches[1].cx, branches[1].cy, branches[1].x2, branches[1].y2, 1
    );
    leafClusters.push({
      x: trunkTip.x, y: trunkTip.y, radius: 11 + rand() * 3,
      anchorX: trunkTip.x, anchorY: trunkTip.y, dirAngle: -Math.PI / 2
    });

    return { branches, leafClusters, trunkBend };
  }

  // ---- Construit une branche avec un point de contrôle de courbure (Bézier quadratique) ----
  // Le décalage du point de contrôle est perpendiculaire au segment, pour un effet sinueux naturel
  function makeCurvedBranch(x1, y1, x2, y2, width, isTrunk, rand) {
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len, perpY = dx / len;
    // courbure plus marquée sur le tronc (plus long, plus de matière pour onduler)
    const curveStrength = (isTrunk ? 0.18 : 0.12) * len * (rand() - 0.5) * 2;
    return {
      x1, y1, x2, y2, width, isTrunk,
      cx: midX + perpX * curveStrength,
      cy: midY + perpY * curveStrength,
      barkSeed: Math.floor(rand() * 100000)
    };
  }

  // ---- Génère N positions de feuilles à l'intérieur des clusters de feuillage (stable via seed) ----
  // Les feuilles sont entrelacées entre les clusters : à n'importe quel niveau intermédiaire,
  // chaque branche a déjà reçu sa juste part de feuillage, pour une silhouette harmonieuse.
  function buildLeafPositions(speciesIndex, count) {
    const skeleton = buildSkeleton(speciesIndex);
    const rand = mulberry32(5000 + speciesIndex * 91);

    // répartit le nombre total de feuilles par cluster, proportionnellement à sa surface
    const totalArea = skeleton.leafClusters.reduce((s, c) => s + c.radius * c.radius, 0);
    let remaining = count;
    const targetPerCluster = skeleton.leafClusters.map((c, i) => {
      const isLast = i === skeleton.leafClusters.length - 1;
      const n = isLast ? remaining : Math.round((c.radius * c.radius / totalArea) * count);
      remaining -= n;
      return Math.max(0, n);
    });

    // pré-génère toutes les positions possibles, cluster par cluster (déterministe)
    const perClusterPositions = skeleton.leafClusters.map((cluster, ci) => {
      const n = targetPerCluster[ci];
      const pts = [];
      for (let i = 0; i < n; i++) {
        // dispersion en arc centré sur la direction de la branche (±100°), pour que le feuillage
        // prolonge visuellement la pointe plutôt que de moitié retomber vers le tronc
        const angle = cluster.dirAngle + (rand() - 0.5) * 2.0;
        const r = Math.sqrt(rand()) * cluster.radius;
        // la rotation de la feuille varie modérément autour de la direction de la branche,
        // pour que le feuillage semble "pousser" dans le sens de la pointe plutôt qu'aléatoire
        // dirAngle suit la convention atan2 (0 = horizontal droite), mais les formes de feuilles
        // sont dessinées avec leur pointe de référence vers le haut (-90°) : on compense ce décalage
        // avant d'ajouter une légère variation aléatoire pour un effet naturel
        const leafRot = cluster.dirAngle + Math.PI / 2 + (rand() - 0.5) * 1.4;
        pts.push({
          x: cluster.x + Math.cos(angle) * r,
          y: cluster.y + Math.sin(angle) * r,
          size: 4.2 + rand() * 4.2,
          rot: leafRot,
          colorIdx: Math.floor(rand() * 3)
        });
      }
      return pts;
    });

    // entrelace : on prend une feuille à tour de rôle dans chaque cluster (round-robin),
    // pondéré par la taille relative de chaque cluster pour rester proportionnel
    const positions = [];
    const cursors = perClusterPositions.map(() => 0);
    let totalRemaining = count;
    while (totalRemaining > 0) {
      let addedThisRound = false;
      for (let ci = 0; ci < perClusterPositions.length; ci++) {
        if (cursors[ci] < perClusterPositions[ci].length) {
          positions.push(perClusterPositions[ci][cursors[ci]]);
          cursors[ci]++;
          totalRemaining--;
          addedThisRound = true;
          if (totalRemaining <= 0) break;
        }
      }
      if (!addedThisRound) break; // sécurité anti-boucle infinie
    }

    return { skeleton, positions };
  }

  // ---- Dessine une branche/tronc : courbe sinueuse, volume cylindrique, texture d'écorce ----
  function drawBranch(ctx, b, baseColor) {
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len, perpY = dx / len;

    // dégradé perpendiculaire à la direction : simule un éclairage latéral sur un cylindre
    const lightOffset = b.width * 0.6;
    const grad = ctx.createLinearGradient(
      b.x1 - perpX * lightOffset, b.y1 - perpY * lightOffset,
      b.x1 + perpX * lightOffset, b.y1 + perpY * lightOffset
    );
    grad.addColorStop(0, lightenColor(baseColor, 18));
    grad.addColorStop(0.45, baseColor);
    grad.addColorStop(1, darkenColor(baseColor, 22));

    // tracé principal : courbe de Bézier quadratique via le point de contrôle
    ctx.strokeStyle = grad;
    ctx.lineCap = "round";
    ctx.lineWidth = b.width;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.quadraticCurveTo(b.cx, b.cy, b.x2, b.y2);
    ctx.stroke();

    // texture d'écorce : petits traits courts, irréguliers, le long de la courbe,
    // seedés par branche pour rester stables d'une frame à l'autre
    const barkRand = mulberry32(b.barkSeed);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = darkenColor(baseColor, 35);
    ctx.lineWidth = Math.max(0.4, b.width * 0.06);
    const strieCount = Math.max(2, Math.floor(b.width * 1.1));
    for (let s = 0; s < strieCount; s++) {
      const tStart = barkRand();
      const tLen = 0.08 + barkRand() * 0.16;
      const lateral = (barkRand() - 0.5) * b.width * 0.7;
      ctx.beginPath();
      for (let step = 0; step <= 4; step++) {
        const t = Math.min(1, tStart + (step / 4) * tLen);
        const pt = quadPoint(b.x1, b.y1, b.cx, b.cy, b.x2, b.y2, t);
        const jitter = (barkRand() - 0.5) * b.width * 0.15;
        const px = pt.x + perpX * (lateral + jitter);
        const py = pt.y + perpY * (lateral + jitter);
        if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Point sur une courbe de Bézier quadratique au paramètre t (0..1)
  function quadPoint(x1, y1, cx, cy, x2, y2, t) {
    const u = 1 - t;
    return {
      x: u * u * x1 + 2 * u * t * cx + t * t * x2,
      y: u * u * y1 + 2 * u * t * cy + t * t * y2
    };
  }

  // Vecteur tangent (dérivée) à une courbe de Bézier quadratique au paramètre t (0..1)
  // Donne la vraie direction de la courbe à ce point, plutôt que la direction du segment droit théorique
  function quadTangent(x1, y1, cx, cy, x2, y2, t) {
    const u = 1 - t;
    return {
      x: 2 * u * (cx - x1) + 2 * t * (x2 - cx),
      y: 2 * u * (cy - y1) + 2 * t * (y2 - cy)
    };
  }

  // ---- Utilitaires couleur : éclaircir/foncer une couleur hex pour le dégradé de volume ----
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }
  function lightenColor(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
  }
  function darkenColor(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
  }

  // ---- Pot du bonsaï : 3 formes possibles, avec dégradé glacé façon céramique et reflet ----
  function drawPot(ctx, pot) {
    const grad = ctx.createLinearGradient(0, 2, 0, 20);
    grad.addColorStop(0, pot.colorLight);
    grad.addColorStop(1, pot.color);

    ctx.save();

    if (pot.shape === "round") {
      // pot rond, type bol large et bas
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-21, 5);
      ctx.quadraticCurveTo(-22, 17, -15, 19);
      ctx.lineTo(15, 19);
      ctx.quadraticCurveTo(22, 17, 21, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // bord supérieur (lèvre du pot)
      ctx.fillStyle = pot.colorLight;
      ctx.beginPath();
      ctx.ellipse(0, 4, 21, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.stroke();
    } else if (pot.shape === "oval") {
      // pot ovale, plus doux, type cerisier/azalée
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 12, 21, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = pot.colorLight;
      ctx.beginPath();
      ctx.ellipse(0, 5, 20, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.stroke();
    } else {
      // pot rectangulaire classique, type érable/pin/orme
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-22, 4); ctx.lineTo(22, 4); ctx.lineTo(18, 19); ctx.lineTo(-18, 19);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // rebord plat supérieur
      ctx.fillStyle = pot.colorLight;
      ctx.fillRect(-23, 1, 46, 4);
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.strokeRect(-23, 1, 46, 4);
      // petits pieds
      ctx.fillStyle = pot.color;
      ctx.fillRect(-16, 19, 4, 3);
      ctx.fillRect(12, 19, 4, 3);
    }

    // léger reflet glacé sur le flanc gauche, commun aux 3 formes
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-12, 11, 4, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ---- Dessin d'une feuille selon la forme de l'espèce ----
  function drawLeaf(ctx, x, y, size, rot, color, shape) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;

    if (shape === "needle") {
      // touffe de 3 aiguilles fines type pin, partant d'un point commun
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.5, size * 0.14);
      ctx.lineCap = "round";
      for (let n = -1; n <= 1; n++) {
        const a = n * 0.32;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.3);
        ctx.lineTo(Math.sin(a) * size * 1.3, -size * 1.1);
        ctx.stroke();
      }
    } else if (shape === "yew") {
      // aiguille plate et courte, plus large que le pin, type if
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.quadraticCurveTo(size * 0.32, size * 0.2, size * 0.16, -size);
      ctx.quadraticCurveTo(0, -size * 1.1, -size * 0.16, -size);
      ctx.quadraticCurveTo(-size * 0.32, size * 0.2, 0, size);
      ctx.fill();
      // nervure centrale
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.8); ctx.lineTo(0, -size * 0.9);
      ctx.stroke();
    } else if (shape === "blossom") {
      // fleur sakura : 5 pétales arrondis échancrés + cœur plus foncé
      for (let p = 0; p < 5; p++) {
        ctx.save();
        ctx.rotate((p / 5) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.15);
        ctx.quadraticCurveTo(size * 0.42, -size * 0.55, size * 0.16, -size * 1.05);
        ctx.quadraticCurveTo(0, -size * 1.15, 0, -size * 0.95);
        ctx.quadraticCurveTo(0, -size * 1.15, -size * 0.16, -size * 1.05);
        ctx.quadraticCurveTo(-size * 0.42, -size * 0.55, 0, -size * 0.15);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(180,60,70,0.55)";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === "azalea") {
      // fleur azalée : pétales plus allongés et pointus que le sakura, plus ouverte
      for (let p = 0; p < 5; p++) {
        ctx.save();
        ctx.rotate((p / 5) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.1);
        ctx.quadraticCurveTo(size * 0.38, -size * 0.7, 0, -size * 1.3);
        ctx.quadraticCurveTo(-size * 0.38, -size * 0.7, 0, -size * 0.1);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(120,30,40,0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.13, 0, Math.PI * 2);
      ctx.fill();
      // petites étamines fines
      ctx.strokeStyle = "rgba(120,30,40,0.4)";
      ctx.lineWidth = 0.4;
      for (let s = 0; s < 3; s++) {
        const a = (s / 3) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5 - size * 0.3);
        ctx.stroke();
      }
    } else if (shape === "maple") {
      // vraie feuille d'érable : 5 lobes pointus avec échancrures, nervures partant du centre
      const lobes = 5;
      ctx.beginPath();
      for (let p = 0; p < lobes; p++) {
        const baseAngle = -Math.PI / 2 + (p - (lobes - 1) / 2) * 0.62;
        const tipX = Math.sin(baseAngle) * size;
        const tipY = -Math.cos(baseAngle) * size;
        const inX = Math.sin(baseAngle - 0.31) * size * 0.42;
        const inY = -Math.cos(baseAngle - 0.31) * size * 0.42;
        const outBeforeX = Math.sin(baseAngle - 0.18) * size * 0.78;
        const outBeforeY = -Math.cos(baseAngle - 0.18) * size * 0.78;
        const outAfterX = Math.sin(baseAngle + 0.18) * size * 0.78;
        const outAfterY = -Math.cos(baseAngle + 0.18) * size * 0.78;

        if (p === 0) ctx.moveTo(inX, inY);
        else ctx.lineTo(inX, inY);
        ctx.lineTo(outBeforeX, outBeforeY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(outAfterX, outAfterY);
      }
      ctx.closePath();
      ctx.fill();
      // nervures fines partant du point d'attache
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 0.4;
      for (let p = 0; p < lobes; p++) {
        const baseAngle = -Math.PI / 2 + (p - (lobes - 1) / 2) * 0.62;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(baseAngle) * size * 0.9, -Math.cos(baseAngle) * size * 0.9);
        ctx.stroke();
      }
    } else if (shape === "cascade") {
      // genévrier : touffe d'écailles en éventail, plus large et fournie
      for (let s = -2; s <= 2; s++) {
        ctx.save();
        ctx.rotate(s * 0.34);
        ctx.beginPath();
        ctx.moveTo(-size * 0.18, size * 0.55);
        ctx.quadraticCurveTo(-size * 0.05, -size * 0.3, 0, -size * 1.05);
        ctx.quadraticCurveTo(size * 0.05, -size * 0.3, size * 0.18, size * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else {
      // orme : feuille ovale asymétrique avec dents marquées sur les bords, nervure centrale visible
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo(size * 0.55, -size * 0.75, size * 0.62, -size * 0.1, size * 0.5, size * 0.25);
      ctx.bezierCurveTo(size * 0.4, size * 0.65, size * 0.18, size * 0.92, 0, size);
      ctx.bezierCurveTo(-size * 0.18, size * 0.92, -size * 0.42, size * 0.6, -size * 0.5, size * 0.2);
      ctx.bezierCurveTo(-size * 0.62, -size * 0.15, -size * 0.5, -size * 0.78, 0, -size);
      ctx.closePath();
      ctx.fill();

      // dents triangulaires marquées sur le contour (visibles même en petit format)
      ctx.fillStyle = color;
      const teeth = 5;
      for (let n = -teeth; n <= teeth; n++) {
        const ty = n * (size / teeth) * 0.85;
        const edgeX = size * (0.55 - Math.pow(Math.abs(n) / teeth, 1.4) * 0.45);
        ctx.beginPath();
        ctx.moveTo(edgeX * 0.82, ty - size * 0.07);
        ctx.lineTo(edgeX * 1.12, ty);
        ctx.lineTo(edgeX * 0.82, ty + size * 0.07);
        ctx.closePath();
        ctx.fill();
        // symétrique à gauche
        ctx.beginPath();
        ctx.moveTo(-edgeX * 0.82, ty - size * 0.07);
        ctx.lineTo(-edgeX * 1.12, ty);
        ctx.lineTo(-edgeX * 0.82, ty + size * 0.07);
        ctx.closePath();
        ctx.fill();
      }

      // nervure centrale + nervures secondaires obliques
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.9); ctx.lineTo(0, size * 0.9);
      for (let n = -3; n <= 3; n++) {
        if (n === 0) continue;
        const ny = n * size * 0.25;
        ctx.moveTo(0, ny);
        ctx.lineTo(Math.sign(n) * size * 0.32, ny + size * 0.18);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Dessine le bonsaï complet à un niveau donné.
   * ctx, cx/cy = base du tronc (point au sol), scale = échelle px par unité, speciesIndex, level (0..888)
   * highlightProgress (0..1, optionnel) : si fourni, anime un halo sur la toute dernière feuille ajoutée
   */
  function draw(ctx, cx, cy, scale, speciesIndex, level, highlightProgress) {
    const species = getSpecies(speciesIndex);
    const leafCount = levelToLeafCount(level);
    const { skeleton, positions } = buildLeafPositions(speciesIndex, LEAF_COUNT);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // pot, distinct par espèce (forme + couleur)
    drawPot(ctx, species.pot);

    // branches/tronc (fixe), dessinées en courbes avec volume et texture d'écorce
    for (const b of skeleton.branches) {
      drawBranch(ctx, b, species.trunkColor);
    }

    // feuilles progressives (seules les `leafCount` premières des 88 sont visibles)
    const lastIdx = leafCount - 1;
    for (let i = 0; i < leafCount && i < positions.length; i++) {
      const p = positions[i];
      const isLast = (i === lastIdx) && highlightProgress !== undefined && highlightProgress !== null;

      if (isLast) {
        // halo pulsant doré derrière la nouvelle feuille
        const haloPulse = 0.5 + Math.sin(highlightProgress * Math.PI * 4) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.55 * (1 - Math.min(1, highlightProgress));
        ctx.fillStyle = "#ffe28a";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2.2 + haloPulse * 1.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // la feuille elle-même grossit légèrement à son apparition (effet "pop")
        const growIn = Math.min(1, highlightProgress * 2.2);
        ctx.save();
        ctx.globalAlpha = growIn;
        drawLeaf(ctx, p.x, p.y, p.size * (0.6 + growIn * 0.4), p.rot, species.leafColor[p.colorIdx], species.leafShape);
        ctx.restore();
      } else {
        drawLeaf(ctx, p.x, p.y, p.size, p.rot, species.leafColor[p.colorIdx], species.leafShape);
      }
    }

    ctx.restore();
  }

  function getLevelsPerTree() { return LEVELS_PER_TREE; }

  function getLeafCount() { return LEAF_COUNT; }

  return { SPECIES, getSpecies, getTotalSpecies, getLevelsPerTree, getLeafCount, levelToLeafCount, draw };
})();
