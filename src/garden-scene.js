/* Décors japonais illustrés, dans le même ordre que les espèces de Bonsai. */
const GardenScene = (() => {
  const scenes = [
    { name: "Crépuscule d’automne", ground: 0.79, shade: "#654751" },
    { name: "Matin d’hiver au mont Fuji", ground: 0.80, shade: "#687f92" },
    { name: "Printemps sous les sakura", ground: 0.77, shade: "#966573" },
    { name: "Jardin de mousse sous la pluie", ground: 0.76, shade: "#4e6458" },
    { name: "Aube sur les rizières", ground: 0.78, shade: "#5e714e" },
    { name: "Kyoto à l’heure bleue", ground: 0.79, shade: "#594969" },
    { name: "Nuit d’hiver au jardin de pierres", ground: 0.80, shade: "#3b495e" }
  ];

  // Centre du pied du pot et demi-largeur de son emprise, en fractions de la case.
  const potContacts = [
    [0.47, 0.97, 0.23], [0.48, 0.97, 0.24], [0.50, 0.96, 0.23],
    [0.31, 0.94, 0.23], [0.48, 0.97, 0.24], [0.46, 0.96, 0.24],
    [0.46, 0.96, 0.25]
  ];

  // Points d’attache des nouvelles feuilles dans chaque illustration (en pourcentage).
  const sproutBranches = [
    [68, 46, 76, 42], [72, 53, 79, 45], [68, 44, 76, 38],
    [76, 52, 84, 48], [73, 48, 82, 44], [73, 52, 81, 46],
    [73, 50, 82, 44]
  ];

  const canopyLights = [
    "#ffdfbb", "#eff7ff", "#ffedf4", "#ddefe4", "#fff0bf", "#f0dcff", "#bdd8ff"
  ];
  let softBackdrop;
  let softBackdropKey;

  function drawLandscape(ctx, width, height, landscapes, index, scene) {
    const image = landscapes[Math.floor(index / 4)];
    if (!image.naturalWidth) {
      ctx.fillStyle = scene.shade;
      ctx.fillRect(0, 0, width, height);
      return height * scene.ground;
    }

    const panel = index % 4;
    const cellWidth = Math.floor(image.naturalWidth / 2);
    const cellHeight = Math.floor(image.naturalHeight / 2);
    const inset = 4;
    const panelWidth = cellWidth - inset * 2;
    const panelHeight = cellHeight - inset * 2;
    const scale = Math.max(width / panelWidth, height / panelHeight);
    const cropWidth = width / scale;
    const cropHeight = height / scale;
    const cropX = (panelWidth - cropWidth) / 2;
    const ground = panelHeight * scene.ground;
    const cropY = Math.min(panelHeight - cropHeight, Math.max(0, ground - cropHeight * 0.83));
    const sourceX = panel % 2 * cellWidth + inset + cropX;
    const sourceY = Math.floor(panel / 2) * cellHeight + inset + cropY;
    ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height);
    const groundY = (ground - cropY) * scale;
    const size = Math.min(width * 0.62, height * 0.51);
    const lightX = width / 2 + (0.5 - potContacts[index][0]) * size;
    const lightY = groundY - (potContacts[index][1] - 0.34) * size;
    const radius = size * 0.83;

    const key = [index, width, height, image.naturalWidth, image.naturalHeight].join("/");
    if (key !== softBackdropKey) {
      softBackdrop ??= document.createElement("canvas");
      softBackdrop.width = Math.ceil(width);
      softBackdrop.height = Math.ceil(height);
      const layer = softBackdrop.getContext("2d");
      layer.filter = "blur(3px) saturate(72%)";
      layer.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height);
      layer.filter = "none";
      layer.globalCompositeOperation = "destination-in";
      const mask = layer.createRadialGradient(lightX, lightY, radius * 0.28, lightX, lightY, radius);
      mask.addColorStop(0, "#fff");
      mask.addColorStop(1, "#fff0");
      layer.fillStyle = mask;
      layer.fillRect(0, 0, width, height);
      softBackdropKey = key;
    }
    ctx.drawImage(softBackdrop, 0, 0);

    const light = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, radius);
    light.addColorStop(0, canopyLights[index] + "70");
    light.addColorStop(0.42, canopyLights[index] + "42");
    light.addColorStop(1, canopyLights[index] + "00");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);
    return groundY;
  }

  function getTreeImages() {
    return {
      bare: document.getElementById("garden-tree-bare"),
      growing: document.getElementById("garden-tree-growing"),
      mature: document.getElementById("garden-tree-atlas"),
      mapleLeaf: document.getElementById("garden-maple-leaf"),
      sproutAtlas: document.getElementById("garden-sprout-atlas")
    };
  }

  function drawTree(ctx, trees, speciesIndex, x, base, size, level, sprout) {
    const atlas = level === 0 ? trees.bare
      : level >= Bonsai.getLevelsPerTree() ? trees.mature : trees.growing;
    if (!atlas.naturalWidth) return;

    const columns = 4;
    const cellWidth = atlas.naturalWidth / columns;
    const cellHeight = atlas.naturalHeight / 2;
    const column = speciesIndex % columns;
    const row = Math.floor(speciesIndex / columns);
    const drawnHeight = size;
    const drawnWidth = drawnHeight * cellWidth / cellHeight;
    // Écarte les traits de séparation des cases sans déplacer le dessin.
    const inset = 2;
    const insetX = inset * drawnWidth / cellWidth;
    const insetY = inset * drawnHeight / cellHeight;
    ctx.drawImage(atlas, column * cellWidth + inset, row * cellHeight + inset,
      cellWidth - 2 * inset, cellHeight - 2 * inset,
      x - drawnWidth / 2 + insetX, base - drawnHeight + insetY,
      drawnWidth - 2 * insetX, drawnHeight - 2 * insetY);

    if (sprout) {
      const [anchorX, anchorY, leafX, leafY] = sproutBranches[speciesIndex];
      const image = speciesIndex === 0 ? trees.mapleLeaf : trees.sproutAtlas;
      if (!image.naturalWidth) return;
      const cell = speciesIndex - 1;
      const width = image.naturalWidth / (speciesIndex === 0 ? 1 : 3);
      const height = image.naturalHeight / (speciesIndex === 0 ? 1 : 2);
      ctx.save();
      ctx.translate(x - drawnWidth / 2, base - drawnHeight);
      ctx.scale(drawnWidth / 100, drawnHeight / 100);
      ctx.globalAlpha *= sprout.opacity;
      Bonsai.drawSprout(ctx, {
        anchorX, anchorY, x: leafX, y: leafY,
        size: 8.6, rot: 0.82, colorIdx: 2
      }, Bonsai.getSpecies(speciesIndex), sprout.progress, {
        image, width, height,
        x: speciesIndex === 0 ? 0 : (cell % 3) * width,
        y: speciesIndex === 0 ? 0 : Math.floor(cell / 3) * height,
        base: speciesIndex === 0 ? 0.99 : 0.925
      });
      ctx.restore();
    }
  }

  function draw(ctx, width, height, landscapes, trees, speciesIndex, level, sprout) {
    const scene = scenes[speciesIndex];
    const ground = drawLandscape(ctx, width, height, landscapes, speciesIndex, scene);
    const size = Math.min(width * 0.62, height * 0.51);
    const center = width / 2;
    const [potX, potY, potRadius] = potContacts[speciesIndex];
    const treeX = center + (0.5 - potX) * size;
    const treeBase = ground + (1 - potY) * size;

    ctx.beginPath();
    ctx.ellipse(center, ground, size * potRadius, size * 0.028, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#20192052";
    ctx.fill();
    drawTree(ctx, trees, speciesIndex, treeX, treeBase, size, level, sprout);
  }

  function getName(speciesIndex) {
    return GameLanguage.item("scenes", speciesIndex, scenes[speciesIndex].name);
  }

  return { draw, drawTree, getName, getTreeImages };
})();
