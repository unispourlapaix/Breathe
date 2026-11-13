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

  // Points d’attache des nouvelles feuilles dans chaque illustration (en pourcentage).
  const sproutBranches = [
    [68, 46, 76, 42], [72, 53, 79, 45], [68, 44, 76, 38],
    [76, 52, 84, 48], [73, 48, 82, 44], [73, 52, 81, 46],
    [73, 50, 82, 44]
  ];

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
    ctx.drawImage(image, panel % 2 * cellWidth + inset + cropX,
      Math.floor(panel / 2) * cellHeight + inset + cropY, cropWidth, cropHeight, 0, 0, width, height);
    return (ground - cropY) * scale;
  }

  function getTreeImages() {
    return {
      bare: document.getElementById("garden-tree-bare"),
      growing: document.getElementById("garden-tree-growing"),
      mature: document.getElementById("garden-tree-atlas")
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
      ctx.save();
      ctx.translate(x - drawnWidth / 2, base - drawnHeight);
      ctx.scale(drawnWidth / 100, drawnHeight / 100);
      ctx.globalAlpha *= sprout.opacity;
      Bonsai.drawSprout(ctx, {
        anchorX, anchorY, x: leafX, y: leafY,
        size: 8.6, rot: 0.82, colorIdx: 2
      }, Bonsai.getSpecies(speciesIndex), sprout.progress);
      ctx.restore();
    }
  }

  function draw(ctx, width, height, landscapes, trees, speciesIndex, level, sprout) {
    const scene = scenes[speciesIndex];
    const ground = drawLandscape(ctx, width, height, landscapes, speciesIndex, scene);
    const size = Math.min(width * 0.62, height * 0.51);
    const center = width / 2;

    ctx.beginPath();
    ctx.ellipse(center, ground, size * 0.25, size * 0.032, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#20192052";
    ctx.fill();
    drawTree(ctx, trees, speciesIndex, center, ground + size * 0.025, size, level, sprout);
  }

  function getName(speciesIndex) {
    return scenes[speciesIndex].name;
  }

  return { draw, drawTree, getName, getTreeImages };
})();
