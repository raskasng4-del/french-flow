const fs = require("fs");
const path = require("path");

const BOT_DIR = __dirname;
const WORDS_FILE = path.join(BOT_DIR, "words.json");
const GRAMMAR_FILE = path.join(BOT_DIR, "grammar.json");
const VERBS_FILE = path.join(BOT_DIR, "verbs.json");
const CURRICULUM_FILE = path.join(BOT_DIR, "curriculum.json");

const words = JSON.parse(fs.readFileSync(WORDS_FILE, "utf-8"));
const grammar = JSON.parse(fs.readFileSync(GRAMMAR_FILE, "utf-8"));
const verbs = JSON.parse(fs.readFileSync(VERBS_FILE, "utf-8"));

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DAYS_PER_LEVEL = { A1: 90, A2: 90, B1: 90, B2: 60, C1: 20, C2: 15 };
const ACTIVITIES = ["MotDuJour", "Grammaire", "PhraseDuJour", "Quiz", "Conjugaison"];

const themes = {
  A1: [
    "Les salutations", "La famille", "Les nombres", "Les couleurs", "Les jours de la semaine",
    "Les mois", "Les saisons", "Les animaux", "La nourriture", "Les boissons",
    "Les vêtements", "La maison", "Les meubles", "La ville", "Les transports",
    "Les directions", "Le temps", "Les loisirs", "Les sports", "La musique",
    "Les professions", "L'école", "Le bureau", "Les achats", "Le marché",
    "Les fruits", "Les légumes", "Les repas", "La cuisine", "Le restaurant",
    "Les sentiments", "La santé", "Le corps", "Les vêtements d'hiver", "Les vêtements d'été",
    "Les accessoires", "Les fêtes", "Les voyages", "L'hôtel", "La plage",
    "La campagne", "La montagne", "Les outils", "La technologie", "L'ordinateur",
    "Le téléphone", "Les réseaux", "Les amis", "La politesse", "Les présentations",
    "Les questions", "Les réponses", "Le café", "Le pain", "Les pâtisseries",
    "Les fromages", "Les vins", "Les apéritifs", "Les invités", "Les cadeaux",
    "Les anniversaires", "Les mariages", "Les traditions", "Les habitudes", "Les projets",
    "Les souvenirs", "Les rêves", "Les espoirs", "Les conseils", "Les ordres",
    "Les interdictions", "Les obligations", "Les permissions", "Les capacités", "Les préférences",
    "Les goûts", "Les opinions", "Les accords", "Les désaccords", "Les excuses",
    "Les remerciements", "Les félicitations", "Les condoléances", "Les invitations",
    "Les rendez-vous", "Les horaires", "Les dates", "Les années", "Les siècles",
  ],
  A2: [
    "Exprimer son opinion", "Parler de ses expériences", "Décrire des personnes", "Parler de ses projets",
    "Exprimer la cause", "Exprimer la conséquence", "Exprimer le but", "Exprimer l'opposition",
    "Exprimer la condition", "Exprimer l'hypothèse", "Exprimer le doute", "Exprimer la certitude",
    "Exprimer la nécessité", "Exprimer la possibilité", "Exprimer l'obligation", "Exprimer l'interdiction",
    "Exprimer la volonté", "Exprimer le souhait", "Exprimer le regret", "Exprimer la déception",
    "Exprimer la joie", "Exprimer la tristesse", "Exprimer la colère", "Exprimer la surprise",
    "Exprimer la peur", "Exprimer l'inquiétude", "Exprimer la fatigue", "Exprimer l'ennui",
    "Exprimer la satisfaction", "Exprimer l'insatisfaction", "Parler de ses goûts",
    "Parler de ses loisirs", "Parler de son travail", "Parler de ses études",
    "Raconter un événement", "Raconter une histoire", "Décrire un lieu", "Décrire un objet",
    "Comparer des choses", "Comparer des personnes", "Choisir entre options",
    "Demander des conseils", "Donner des conseils", "Accepter des conseils",
    "Refuser poliment", "Proposer quelque chose", "Accepter une proposition",
    "Refuser une proposition", "Inviter quelqu'un", "Accepter une invitation",
    "Refuser une invitation", "Remercier", "S'excuser", "Accepter des excuses",
    "Se présenter formellement", "Se renseigner", "Demander des précisions",
    "Confirmer des informations", "Infirmer des informations", "Corriger une erreur",
    "Exprimer son accord", "Exprimer son désaccord", "Nuancer son opinion",
    "Argumenter", "Convaincre", "Persuader", "Négocier", "Discuter",
    "Débattre", "Échanger des idées", "Partager des expériences",
    "Organiser un événement", "Planifier des vacances", "Préparer un voyage",
    "Faire des courses", "Commander au restaurant", "Acheter des billets",
    "Réserver une chambre", "Louer une voiture", "Demander son chemin",
    "Utiliser les transports", "Aller chez le médecin", "Acheter des médicaments",
    "Prendre rendez-vous", "Aller à la banque", "Envoyer un colis",
  ],
  B1: [
    "Les relations sociales", "Les médias", "L'actualité", "La politique",
    "L'économie", "La finance", "Le commerce", "Les affaires",
    "La publicité", "Le marketing", "Le management", "Les ressources humaines",
    "La formation", "Le développement", "L'innovation", "La recherche",
    "La science", "La technologie", "Le numérique", "Internet",
    "Les réseaux sociaux", "La cybersécurité", "Les données", "L'intelligence artificielle",
    "L'environnement", "Le climat", "L'écologie", "Le développement durable",
    "Les énergies", "La pollution", "Le recyclage", "La biodiversité",
    "L'urbanisme", "L'architecture", "Les transports modernes", "Les smart cities",
    "La culture", "Le cinéma", "Le théâtre", "La littérature",
    "La poésie", "La peinture", "La sculpture", "La photographie",
    "Les musées", "Les expositions", "Les festivals", "Les concerts",
    "La santé publique", "La médecine", "La nutrition", "Le sport professionnel",
    "Les droits de l'homme", "L'égalité", "La diversité", "L'inclusion",
    "L'immigration", "La mondialisation", "Les échanges culturels", "Le tourisme",
    "Les réseaux professionnels", "Le télétravail", "Les start-ups", "L'entrepreneuriat",
    "L'artisanat", "Le commerce équitable", "L'agriculture bio", "La gastronomie",
    "Les tendances", "La mode", "Le design", "L'esthétique",
    "Les philosophies", "Les croyances", "Les valeurs", "L'éthique",
    "Les défis", "Les solutions", "Les innovations", "Les perspectives",
    "Les réformes", "Les progrès", "Les évolutions", "Les révolutions",
  ],
  B2: [
    "Analyser un phénomène", "Synthétiser des informations", "Critiquer un argument",
    "Défendre une thèse", "Réfuter une objection", "Évaluer des propositions",
    "Interpréter des données", "Contextualiser des faits", "Problématiser une question",
    "Conceptualiser des idées", "Théoriser des pratiques", "Modéliser des systèmes",
    "Optimiser des processus", "Innover dans des méthodes", "Restructurer des organisations",
    "Anticiper des tendances", "Planifier des stratégies", "Coordonner des équipes",
    "Médier des conflits", "Négocier des accords", "Arbitrer des débats",
    "Consulter des experts", "Délibérer des décisions", "Ratifier des conventions",
    "Implémenter des solutions", "Évaluer des impacts", "Auditer des pratiques",
    "Certifier des compétences", "Accréditer des programmes", "Habiliter des professionnels",
    "Développer des partenariats", "Mobiliser des ressources", "Fédérer des acteurs",
    "Sensibiliser des publics", "Former des apprenants", "Accompagner des changements",
    "Promouvoir des initiatives", "Valoriser des talents", "Reconnaître des mérites",
    "Célébrer des réussites", "Tirer des leçons", "Capitaliser des expériences",
    "Diffuser des savoirs", "Transmettre des compétences", "Partager des expertises",
    "Inspirer des vocations", "Encourager des passions", "Soutenir des causes",
    "Contribuer à la société", "S'engager citoyennement", "Agir responsablement",
    "Penser globalement", "Agir localement", "Vivre durablement", "Progresser continûment",
    "S'adapter aux changements", "Apprendre tout au long de la vie", "Se dépasser",
  ],
  C1: [
    "Approfondir la grammaire avancée", "Maîtriser les nuances stylistiques",
    "Perfectionner l'expression écrite", "Affiner l'expression orale",
    "Analyser des textes littéraires", "Interpréter des discours", "Commenter des essais",
    "Rédiger des rapports détaillés", "Produire des synthèses complexes",
    "Argumenter avec subtilité", "Convaincre avec éloquence", "Débattre avec rigueur",
    "Négocier avec finesse", "Médier avec tact", "Conseiller avec pertinence",
    "Critiquer avec justesse", "Évaluer avec objectivité", "Juger avec discernement",
    "S'adapter aux contextes", "Varier les registres", "Jouer avec les mots",
  ],
  C2: [
    "Maîtrise parfaite des subtilités", "Expression spontanée et fluide",
    "Compréhension de tout type de texte", "Production de textes complexes",
    "Adaptation à tous les contextes", "Maîtrise des expressions idiomatiques",
    "Capacité d'abstraction avancée", "Analyse critique approfondie",
    "Synthèse d'informations complexes", "Communication interculturelle",
    "Expertise linguistique complète", "Précision et élégance stylistique",
    "Créativité langagière", "Maîtrise de l'implicite", "Aisance argumentative",
  ],
};

const MISSING = { A1: { words: [], grammar: [], verbs: [] }, A2: { words: [], grammar: [], verbs: [] }, B1: { words: [], grammar: [], verbs: [] }, B2: { words: [], grammar: [], verbs: [] }, C1: { words: [], grammar: [], verbs: [] }, C2: { words: [], grammar: [], verbs: [] } };

const days = [];
let dayNum = 0;

for (const level of LEVELS) {
  const lWords = words.filter(w => w.level === level || (["C1", "C2"].includes(level) && w.level === "B2"));
  const lGrammar = grammar.filter(g => g.level === level || (["C1", "C2"].includes(level) && g.level === "B2"));
  const lVerbs = verbs.filter(v => v.level === level || (["C1", "C2"].includes(level) && v.level === "B2"));
  const numDays = DAYS_PER_LEVEL[level];
  const lThemes = themes[level];

  for (let d = 0; d < numDays; d++) {
    dayNum++;
    const theme = lThemes[d % lThemes.length];
    const activities = [];

    for (let a = 0; a < ACTIVITIES.length; a++) {
      const type = ACTIVITIES[a];
      if (type === "MotDuJour") {
        const w = lWords[(d * 2 + 0) % lWords.length];
        if (w) activities.push({ type: "MotDuJour", word_id: w.id });
        else MISSING[level].words.push(d);
      } else if (type === "PhraseDuJour") {
        const w = lWords[(d * 2 + 1) % lWords.length];
        if (w) activities.push({ type: "PhraseDuJour", word_id: w.id });
        else MISSING[level].words.push(d);
      } else if (type === "Grammaire") {
        const g = lGrammar[d % lGrammar.length];
        if (g) activities.push({ type: "Grammaire", grammar_id: g.id });
        else MISSING[level].grammar.push(d);
      } else if (type === "Quiz") {
        const w = lWords[(d * 2 + 1) % lWords.length];
        if (w) activities.push({ type: "Quiz", word_id: w.id });
        else MISSING[level].words.push(d);
      } else if (type === "Conjugaison") {
        const v = lVerbs[d % lVerbs.length];
        if (v) activities.push({ type: "Conjugaison", verb_id: v.id });
        else MISSING[level].verbs.push(d);
      }
    }

    days.push({
      day: dayNum,
      theme,
      level,
      activities,
    });
  }
}

const curriculum = { generated: "2026-05-24", days };
const content = JSON.stringify(curriculum, null, 2);
fs.writeFileSync(CURRICULUM_FILE, content, "utf-8");

const total = days.length;
const acts = days.reduce((a, d) => a + d.activities.length, 0);
console.log(`✅ Curriculum généré: ${total} jours, ${acts} activités`);
for (const level of LEVELS) {
  const lWords = words.filter(w => w.level === level || (["C1", "C2"].includes(level) && w.level === "B2"));
  const lGrammar = grammar.filter(g => g.level === level || (["C1", "C2"].includes(level) && g.level === "B2"));
  const lVerbs = verbs.filter(v => v.level === level || (["C1", "C2"].includes(level) && v.level === "B2"));
  const m = MISSING[level];
  const wOk = m.words.length === 0 ? "✅" : `❌ ${m.words.length}`;
  const gOk = m.grammar.length === 0 ? "✅" : `❌ ${m.grammar.length}`;
  const vOk = m.verbs.length === 0 ? "✅" : `❌ ${m.verbs.length}`;
  console.log(`  ${level}: ${DAYS_PER_LEVEL[level]}j | mots:${lWords.length} ${wOk} | grammaire:${lGrammar.length} ${gOk} | verbes:${lVerbs.length} ${vOk}`);
}
