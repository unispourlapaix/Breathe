/* ============================================
   MOD-QUOTES-001 : Banque de dictons et proverbes
   Indépendant — peut être étendu sans toucher au reste du jeu
   ============================================ */

const QUOTE_BANK = [
  { id: "Q001", text: "Patience et longueur de temps font plus que force ni que rage.", author: "proverbe" },
  { id: "Q002", text: "La paix ne s'impose pas, elle se cultive comme un jardin.", author: "sagesse" },
  { id: "Q003", text: "Un sourire ne coûte rien et illumine tout sur son passage.", author: "proverbe" },
  { id: "Q004", text: "Celui qui plante un bambou n'en verra peut-être pas l'ombre, mais il aura planté.", author: "sagesse" },
  { id: "Q005", text: "L'eau qui dort finit par croupir, l'eau qui coule reste pure.", author: "proverbe" },
  { id: "Q006", text: "Un cœur reconnaissant trouve toujours une raison de chanter.", author: "sagesse" },
  { id: "Q007", text: "Mieux vaut allumer une bougie que maudire l'obscurité.", author: "proverbe" },
  { id: "Q008", text: "Le pardon est un cadeau qu'on s'offre à soi-même.", author: "sagesse" },
  { id: "Q009", text: "Pourquoi le poisson rouge n'a jamais d'argent ? Parce qu'il vit dans son bocal !", author: "dicton rigolo" },
  { id: "Q010", text: "Le bambou plie sous la tempête mais ne casse jamais, là est sa force.", author: "sagesse" },
  { id: "Q011", text: "Qui se lève tôt voit le cerisier fleurir avant tout le monde.", author: "proverbe" },
  { id: "Q012", text: "Pourquoi le moine ne ferme jamais sa porte ? Pour laisser entrer la paix !", author: "dicton rigolo" },
  { id: "Q013", text: "La vraie richesse se mesure en gratitude, pas en pièces d'or.", author: "sagesse" },
  { id: "Q014", text: "Petit pas après petit pas, on traverse la plus haute montagne.", author: "proverbe" },
  { id: "Q015", text: "Un papillon ne compte pas les fleurs qu'il a visitées, il savoure chacune d'elles.", author: "sagesse" },
  { id: "Q016", text: "Pourquoi le nuage est triste ? Parce qu'il a toujours la tête dans les vapeurs !", author: "dicton rigolo" },
  { id: "Q017", text: "Celui qui sème la bonté récolte la paix.", author: "proverbe" },
  { id: "Q018", text: "Le silence aussi est une réponse, et parfois la plus sage.", author: "sagesse" },
  { id: "Q019", text: "La joie partagée vaut deux fois la joie gardée pour soi.", author: "proverbe" },
  { id: "Q020", text: "Pourquoi le bonsaï ne grandit jamais vite ? Il prend le temps de bien s'enraciner !", author: "dicton rigolo" },
  { id: "Q021", text: "Aimer son prochain, c'est déjà porter une part de sa charge.", author: "sagesse" },
  { id: "Q022", text: "La pluie tombe sur le juste et l'injuste, mais l'arc-en-ciel appartient à tous.", author: "proverbe" },
  { id: "Q023", text: "Un grain de riz à la fois, et la montagne de rizière se remplit.", author: "sagesse" },
  { id: "Q024", text: "Pourquoi le sage ne court jamais ? Parce que la sagesse n'est pas une course !", author: "dicton rigolo" },
  { id: "Q025", text: "Ce que tu donnes avec amour te revient toujours, sous une forme ou une autre.", author: "sagesse" },

  /* ---- Ajouts : sagesse ---- */
  { id: "Q026", text: "On ne voit pas grandir le bambou, mais un jour il touche le ciel.", author: "sagesse" },
  { id: "Q027", text: "La racine profonde n'a pas peur du vent.", author: "proverbe" },
  { id: "Q028", text: "Celui qui écoute vraiment entend ce qui n'est pas dit.", author: "sagesse" },
  { id: "Q029", text: "Le vide entre deux notes fait toute la musique.", author: "sagesse" },
  { id: "Q030", text: "On ne traverse jamais deux fois la même rivière, ni le même cœur.", author: "proverbe" },
  { id: "Q031", text: "La lenteur n'est pas un retard quand on marche vers la paix.", author: "sagesse" },
  { id: "Q032", text: "Un arbre courbé par le vent raconte une histoire que le vent a oubliée.", author: "sagesse" },
  { id: "Q033", text: "La main qui donne ne s'appauvrit jamais du cœur.", author: "proverbe" },
  { id: "Q034", text: "Ce qui est brisé peut être réparé avec de l'or, et devenir plus précieux encore.", author: "sagesse" },
  { id: "Q035", text: "On reconnaît la force d'un homme à la douceur qu'il choisit malgré elle.", author: "sagesse" },

  /* ---- Ajouts : dictons rigolos ---- */
  { id: "Q036", text: "Pourquoi le samouraï n'est jamais en retard ? Il a le sens de l'honneur-aire !", author: "dicton rigolo" },
  { id: "Q037", text: "Le zen, c'est facile : il suffit de ne penser à rien... en y pensant très fort.", author: "dicton rigolo" },
  { id: "Q038", text: "Un bonsaï miniature reste un arbre à l'ego normal.", author: "dicton rigolo" },
  { id: "Q039", text: "Pourquoi le thé vert ne se vexe jamais ? Il a l'habitude qu'on le laisse infuser.", author: "dicton rigolo" },
  { id: "Q040", text: "La méditation, c'est gratuit, sauf le coussin ergonomique à 80 euros.", author: "dicton rigolo" },
  { id: "Q041", text: "Pourquoi le koï ne stresse jamais ? Il tourne toujours en rond, mais avec classe.", author: "dicton rigolo" },
  { id: "Q042", text: "Un vrai maître zen sait rester calme... tant que le wifi fonctionne.", author: "dicton rigolo" },
  { id: "Q043", text: "Pourquoi le papillon ne se presse jamais ? Il sait que sa vie est déjà courte, alors autant la savourer lentement.", author: "dicton rigolo" },
  { id: "Q044", text: "Le calme intérieur, ça se cultive. Comme les mauvaises herbes, mais à l'envers.", author: "dicton rigolo" },
  { id: "Q045", text: "Pourquoi le caillou du jardin zen ne bouge jamais ? Il a trouvé sa vocation très tôt.", author: "dicton rigolo" },

  /* ---- Ajouts : sarcastiques (gentiment piquants, jamais méchants) ---- */
  { id: "Q046", text: "Respire profondément. Ça ne réglera pas le problème, mais au moins tu seras détendu en l'ignorant.", author: "sagesse à pincettes" },
  { id: "Q047", text: "Le sage dit : lâche prise. Le compte en banque, lui, ne lâche jamais rien.", author: "sagesse à pincettes" },
  { id: "Q048", text: "On t'a dit que la patience est une vertu. Personne n'a précisé qu'elle était aussi un sport extrême.", author: "sagesse à pincettes" },
  { id: "Q049", text: "Vivre l'instant présent, c'est facile, sauf quand l'instant présent c'est une salle d'attente.", author: "sagesse à pincettes" },
  { id: "Q050", text: "Le bonheur ne s'achète pas. Mais bon, un bon café aide quand même beaucoup.", author: "sagesse à pincettes" },
  { id: "Q051", text: "La sagesse, c'est savoir qu'on ne sait rien. Ça tombe bien, ça simplifie les choses.", author: "sagesse à pincettes" },
  { id: "Q052", text: "Médite chaque jour, disent-ils. Ils n'ont jamais essayé avec un voisin qui perce à 8h.", author: "sagesse à pincettes" },
  { id: "Q053", text: "Accepte ce que tu ne peux pas changer. Genre la file d'attente à la poste.", author: "sagesse à pincettes" },
  { id: "Q054", text: "Le chemin compte plus que la destination, sauf si tu es en retard.", author: "sagesse à pincettes" },
  { id: "Q055", text: "Sois comme l'eau, disent les sages. L'eau, elle, n'a jamais eu à remplir de déclaration d'impôts.", author: "sagesse à pincettes" },
];

// Formulations originales inspirées des versets indiqués, réutilisables sans restriction.
const BIBLICAL_THOUGHTS = [
  ["3,5", "Confie-toi à Dieu, même quand tu ne vois pas tout le chemin."],
  ["3,27", "Fais le bien dès que tu en as la possibilité."],
  ["4,23", "Prends soin de ton cœur. Tes choix y prennent racine."],
  ["10,12", "L’amour sait apaiser les querelles."],
  ["11,25", "En aidant les autres, on trouve aussi de quoi reprendre souffle."],
  ["12,18", "Des mots choisis avec soin peuvent réparer une blessure."],
  ["12,25", "Une parole bienveillante allège un cœur inquiet."],
  ["13,20", "La sagesse grandit au contact des gens sages."],
  ["14,29", "Avant de te mettre en colère, prends le temps de comprendre."],
  ["14,30", "Un cœur paisible fait du bien au corps."],
  ["15,1", "Un mot dit avec douceur peut calmer la colère."],
  ["15,17", "Un repas simple partagé avec amour est déjà un festin."],
  ["16,3", "Remets tes projets à Dieu avant de te mettre à l’œuvre."],
  ["16,9", "Tu peux tracer ta route et laisser Dieu guider tes pas."],
  ["16,24", "Une parole aimable redonne des forces."],
  ["16,32", "Garder son calme demande plus de force que gagner une bataille."],
  ["17,9", "Le pardon donne à l’amitié une chance de grandir."],
  ["17,17", "On reconnaît un ami à sa présence dans les jours difficiles."],
  ["17,22", "La joie du cœur aide à reprendre des forces."],
  ["18,13", "Écoute jusqu’au bout avant de répondre."],
  ["27,9", "Un conseil sincère fait du bien, comme un parfum familier."]
].map(([verse, text]) => ({
  id: "Pr " + verse,
  text,
  author: "D’après Proverbes " + verse
}));

function getRandomQuote(excludeId, quotes = QUOTE_BANK) {
  const pool = quotes.filter(quote => quote.id !== excludeId);
  const quote = pool[Math.floor(Math.random() * pool.length)];
  const index = quotes.indexOf(quote);
  const biblical = quotes === BIBLICAL_THOUGHTS;
  return {
    id: quote.id,
    text: GameLanguage.item(biblical ? "thoughts" : "quotes", index, quote.text),
    author: biblical ? GameLanguage.text("proverbs") + " " + quote.id.slice(3)
      : GameLanguage.text(quote.author)
  };
}
