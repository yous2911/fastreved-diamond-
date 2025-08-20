export interface CE1CompetenceData {
  code: string;
  titre: string;
  description: string;
  prerequis_cp: string[];
  prerequis_details: string[];
  saut_qualitatif?: string;
  nouveaute?: string;
  evaluation: string;
  donnees_chiffrees?: Record<string, any>;
}

export interface CE1CompetenceDomain {
  [competenceCode: string]: CE1CompetenceData;
}

export interface CE1CompetenceFramework {
  niveau: string;
  annee_application: string;
  competences: {
    francais: {
      oral: CE1CompetenceDomain;
      lecture: CE1CompetenceDomain;
      ecriture: CE1CompetenceDomain;
      vocabulaire: CE1CompetenceDomain;
      grammaire: CE1CompetenceDomain;
    };
    mathematiques: {
      nombres: CE1CompetenceDomain;
      calcul: CE1CompetenceDomain;
      problemes: CE1CompetenceDomain;
      grandeurs_mesures: CE1CompetenceDomain;
      espace_geometrie: CE1CompetenceDomain;
      organisation_donnees: CE1CompetenceDomain;
    };
  };
}

export const CE1_COMPETENCES_2025: CE1CompetenceFramework = {
  niveau: "CE1",
  annee_application: "2025-2026",
  competences: {
    francais: {
      oral: {
        "CE1.FR.O1.1": {
          code: "CE1.FR.O1.1",
          titre: "Maintenir une attention orientée en fonction d'un but lors d'écoutes longues",
          description: "Développer la capacité d'écoute soutenue et orientée vers un objectif spécifique",
          prerequis_cp: ["CP.FR.O1.1", "CP.FR.O1.2"],
          prerequis_details: [
            "Écouter pour comprendre des consignes courtes",
            "Maintenir l'attention sur des récits courts"
          ],
          saut_qualitatif: "Passage d'écoutes courtes à des écoutes longues et orientées",
          evaluation: "Observation de l'attention lors d'écoutes de 10-15 minutes"
        },
        "CE1.FR.O1.2": {
          code: "CE1.FR.O1.2",
          titre: "Repérer et mémoriser des informations importantes dans un texte entendu",
          description: "Extraire et retenir les éléments clés d'un texte lu par l'adulte",
          prerequis_cp: ["CP.FR.C1.1", "CP.FR.C1.2"],
          prerequis_details: [
            "Compréhension de phrases à l'oral - 85,4% maîtrise",
            "Identifier les personnages et actions principales"
          ],
          saut_qualitatif: "Passage de la compréhension de phrases à celle de textes complets",
          evaluation: "Questionnaires de compréhension après écoute de textes"
        },
        "CE1.FR.O2.1": {
          code: "CE1.FR.O2.1",
          titre: "Organiser son discours pour expliquer une règle ou présenter un travail",
          description: "Structurer ses explications de manière logique et claire",
          prerequis_cp: ["CP.FR.O2.1", "CP.FR.V1.1"],
          prerequis_details: [
            "S'exprimer avec clarté",
            "Utiliser un vocabulaire approprié"
          ],
          saut_qualitatif: "Passage d'expressions simples à des explications structurées",
          evaluation: "Présentations orales d'explications ou de travaux"
        },
        "CE1.FR.O2.2": {
          code: "CE1.FR.O2.2",
          titre: "Réciter un texte mémorisé avec une expression adaptée",
          description: "Réciter des textes en respectant la ponctuation et l'intonation",
          prerequis_cp: ["CP.FR.O2.2", "CP.FR.L3.1"],
          prerequis_details: [
            "Réciter des comptines courtes",
            "Lire à voix haute avec intonation"
          ],
          saut_qualitatif: "Passage de comptines à des textes plus longs avec expression",
          evaluation: "Récitations avec expression et respect de la ponctuation"
        }
      },
      lecture: {
        "CE1.FR.L1.1": {
          code: "CE1.FR.L1.1",
          titre: "Identifier automatiquement les mots avec syllabes complexes",
          description: "Décoder automatiquement les mots contenant des syllabes complexes",
          prerequis_cp: ["CP.FR.L1.1", "CP.FR.L1.2", "CP.FR.L1.3"],
          prerequis_details: [
            "Discriminer les sons et analyser les constituants des mots",
            "Maîtriser les correspondances graphophonologiques",
            "Mémoriser les composantes du code alphabétique"
          ],
          saut_qualitatif: "Automatisation du décodage des syllabes complexes",
          evaluation: "Tests de décodage de mots avec syllabes complexes"
        },
        "CE1.FR.L1.2": {
          code: "CE1.FR.L1.2",
          titre: "Lire avec une fluence de 70 mots par minute",
          description: "Développer la vitesse de lecture tout en maintenant la compréhension",
          prerequis_cp: ["CP.FR.L1.4", "CP.FR.L1.5"],
          prerequis_details: [
            "Fluence de 50 mots par minute",
            "Mémoriser les mots fréquents et irréguliers"
          ],
          saut_qualitatif: "Fluence 50 → 70 mots/minute",
          donnees_chiffrees: { fluence_objectif: 70, fluence_cp: 50 },
          evaluation: "Tests de fluence chronométrés"
        },
        "CE1.FR.L2.1": {
          code: "CE1.FR.L2.1",
          titre: "Comprendre un texte d'une vingtaine de lignes lu en autonomie",
          description: "Comprendre des textes plus longs lus de manière autonome",
          prerequis_cp: ["CP.FR.C2.1", "CP.FR.C2.2"],
          prerequis_details: [
            "Comprendre des phrases lues seul",
            "Comprendre des textes courts adaptés"
          ],
          saut_qualitatif: "Passage de textes courts à des textes de 20 lignes",
          evaluation: "Questionnaires de compréhension sur textes autonomes"
        },
        "CE1.FR.L2.2": {
          code: "CE1.FR.L2.2",
          titre: "Réaliser des inférences complexes à partir d'un texte",
          description: "Déduire des informations implicites dans un texte",
          prerequis_cp: ["CP.FR.C2.3", "CP.FR.C2.4"],
          prerequis_details: [
            "Réaliser des inférences simples",
            "Mobiliser ses expériences pour comprendre"
          ],
          saut_qualitatif: "Passage d'inférences simples à des inférences complexes",
          evaluation: "Tests d'inférences sur textes lus"
        },
        "CE1.FR.L3.1": {
          code: "CE1.FR.L3.1",
          titre: "Ranger les mots dans l'ordre alphabétique",
          description: "Maîtriser l'ordre alphabétique pour classer des mots",
          prerequis_cp: ["CP.FR.L1.6", "CP.FR.V2.1"],
          prerequis_details: [
            "Connaître le nom des lettres",
            "Connaître l'ordre alphabétique"
          ],
          nouveaute: "Classement alphabétique de mots",
          evaluation: "Exercices de classement alphabétique"
        }
      },
      ecriture: {
        "CE1.FR.E1.1": {
          code: "CE1.FR.E1.1",
          titre: "Tracer toutes les majuscules cursives",
          description: "Maîtriser l'écriture des majuscules en cursive",
          prerequis_cp: ["CP.FR.E1.1", "CP.FR.E1.2"],
          prerequis_details: [
            "Maîtriser les minuscules cursives",
            "Contrôler les gestes de l'écriture"
          ],
          nouveaute: "Introduction des majuscules cursives",
          evaluation: "Écriture de majuscules cursives sur réglure"
        },
        "CE1.FR.E1.2": {
          code: "CE1.FR.E1.2",
          titre: "Copier une dizaine de lignes sans erreur",
          description: "Copier des textes plus longs avec précision",
          prerequis_cp: ["CP.FR.E1.3", "CP.FR.E1.4"],
          prerequis_details: [
            "Copier des phrases courtes",
            "Utiliser des stratégies de copie"
          ],
          saut_qualitatif: "Passage de phrases courtes à une dizaine de lignes",
          evaluation: "Copie de textes de 10 lignes sans erreur"
        },
        "CE1.FR.E2.1": {
          code: "CE1.FR.E2.1",
          titre: "Rédiger des textes de plusieurs phrases en autonomie",
          description: "Écrire des textes courts de manière autonome",
          prerequis_cp: ["CP.FR.E2.1", "CP.FR.E2.2"],
          prerequis_details: [
            "Écrire des phrases simples",
            "Organiser ses idées"
          ],
          saut_qualitatif: "Passage de phrases simples à des textes de plusieurs phrases",
          evaluation: "Rédaction de textes courts autonomes"
        },
        "CE1.FR.E2.2": {
          code: "CE1.FR.E2.2",
          titre: "Utiliser des connecteurs temporels (d'abord, puis, ensuite, enfin)",
          description: "Structurer un texte avec des connecteurs temporels",
          prerequis_cp: ["CP.FR.E2.3", "CP.FR.G2.1"],
          prerequis_details: [
            "Utiliser 'et' pour relier les mots",
            "Comprendre l'ordre chronologique"
          ],
          nouveaute: "Introduction des connecteurs temporels",
          evaluation: "Rédaction de textes avec connecteurs temporels"
        }
      },
      vocabulaire: {
        "CE1.FR.V1.1": {
          code: "CE1.FR.V1.1",
          titre: "Enrichir les corolles lexicales constituées au CP",
          description: "Étendre le vocabulaire thématique acquis au CP",
          prerequis_cp: ["CP.FR.V1.1", "CP.FR.V1.2"],
          prerequis_details: [
            "Constituer des corolles lexicales par thème",
            "Mobiliser le vocabulaire en contexte"
          ],
          saut_qualitatif: "Extension des corolles lexicales existantes",
          evaluation: "Tests de vocabulaire thématique"
        },
        "CE1.FR.V1.2": {
          code: "CE1.FR.V1.2",
          titre: "Trouver des synonymes, antonymes et mots de même famille",
          description: "Comprendre les relations lexicales entre les mots",
          prerequis_cp: ["CP.FR.V1.3", "CP.FR.V1.4"],
          prerequis_details: [
            "Comprendre les relations de sens",
            "Identifier les mots qui vont ensemble"
          ],
          nouveaute: "Introduction des synonymes, antonymes et familles de mots",
          evaluation: "Exercices de relations lexicales"
        },
        "CE1.FR.V2.1": {
          code: "CE1.FR.V2.1",
          titre: "Consulter un dictionnaire et se repérer dans un article",
          description: "Utiliser un dictionnaire pour chercher des informations",
          prerequis_cp: ["CP.FR.V2.1", "CP.FR.L1.6"],
          prerequis_details: [
            "Connaître l'ordre alphabétique",
            "Connaître le nom des lettres"
          ],
          nouveaute: "Utilisation autonome du dictionnaire",
          evaluation: "Recherche dans le dictionnaire"
        },
        "CE1.FR.V3.1": {
          code: "CE1.FR.V3.1",
          titre: "Mémoriser un corpus organisé de mots invariables",
          description: "Apprendre et mémoriser les mots invariables essentiels",
          prerequis_cp: ["CP.FR.V3.1", "CP.FR.G3.1"],
          prerequis_details: [
            "Mémoriser les premiers mots invariables",
            "Vigilance orthographique"
          ],
          saut_qualitatif: "Extension du corpus de mots invariables",
          evaluation: "Dictées de mots invariables"
        }
      },
      grammaire: {
        "CE1.FR.G1.1": {
          code: "CE1.FR.G1.1",
          titre: "Identifier le sujet et le verbe dans une phrase",
          description: "Reconnaître les éléments essentiels de la phrase",
          prerequis_cp: ["CP.FR.G1.1", "CP.FR.G1.2"],
          prerequis_details: [
            "Identifier la phrase",
            "Reconnaître les principales classes de mots"
          ],
          saut_qualitatif: "Passage de l'identification de la phrase à celle du sujet et verbe",
          evaluation: "Analyse grammaticale de phrases simples"
        },
        "CE1.FR.G1.2": {
          code: "CE1.FR.G1.2",
          titre: "Différencier les 3 types de phrases (déclaratives, interrogatives, impératives)",
          description: "Reconnaître et utiliser les différents types de phrases",
          prerequis_cp: ["CP.FR.G1.3", "CP.FR.G1.4"],
          prerequis_details: [
            "Distinguer phrase et non-phrase",
            "Reconnaître les signes de ponctuation"
          ],
          nouveaute: "Classification des types de phrases",
          evaluation: "Identification et production de types de phrases"
        },
        "CE1.FR.G2.1": {
          code: "CE1.FR.G2.1",
          titre: "Réaliser des accords en genre et nombre dans le groupe nominal",
          description: "Accorder les déterminants et adjectifs avec le nom",
          prerequis_cp: ["CP.FR.G2.1", "CP.FR.G2.2"],
          prerequis_details: [
            "Comprendre la notion d'accord",
            "Identifier masculin/féminin et singulier/pluriel"
          ],
          saut_qualitatif: "Passage de la compréhension à l'application des accords",
          evaluation: "Exercices d'accord dans le groupe nominal"
        },
        "CE1.FR.G2.2": {
          code: "CE1.FR.G2.2",
          titre: "Conjuguer être, avoir et verbes du 1er groupe aux temps étudiés",
          description: "Maîtriser la conjugaison des verbes essentiels",
          prerequis_cp: ["CP.FR.G2.3", "CP.FR.G2.4"],
          prerequis_details: [
            "Identifier le verbe dans la phrase",
            "Connaître être et avoir au présent"
          ],
          saut_qualitatif: "Extension de la conjugaison à plus de verbes et temps",
          evaluation: "Conjugaison de verbes aux temps étudiés"
        },
        "CE1.FR.G2.3": {
          code: "CE1.FR.G2.3",
          titre: "Conjuguer 8 verbes irréguliers du 3e groupe",
          description: "Apprendre la conjugaison de verbes irréguliers fréquents",
          prerequis_cp: ["CP.FR.G2.4", "CP.FR.G2.5"],
          prerequis_details: [
            "Connaître être et avoir au présent",
            "Comprendre la notion de temps"
          ],
          nouveaute: "Introduction des verbes irréguliers du 3e groupe",
          evaluation: "Conjugaison de verbes irréguliers"
        }
      }
    },
    mathematiques: {
      nombres: {
        "CE1.MA.N1.1": {
          code: "CE1.MA.N1.1",
          titre: "Maîtriser les nombres jusqu'à 1000",
          description: "Comprendre et utiliser les nombres jusqu'à 1000",
          prerequis_cp: ["CP.MA.N1.1", "CP.MA.N1.2"],
          prerequis_details: [
            "Nombres jusqu'à 59 en période 2",
            "Nombres jusqu'à 100 en période 3"
          ],
          saut_qualitatif: "Nombres jusqu'à 100 → jusqu'à 1000",
          donnees_chiffrees: { limite_cp: 100, limite_ce1: 1000 },
          evaluation: "Tests de numération jusqu'à 1000"
        },
        "CE1.MA.N1.2": {
          code: "CE1.MA.N1.2",
          titre: "Compter de 2 en 2, de 5 en 5, de 10 en 10",
          description: "Maîtriser les comptages par intervalles",
          prerequis_cp: ["CP.MA.N1.3", "CP.MA.N1.4"],
          prerequis_details: [
            "Compter jusqu'à 100",
            "Comprendre la dizaine"
          ],
          nouveaute: "Comptages par intervalles réguliers",
          evaluation: "Tests de comptage par intervalles"
        },
        "CE1.MA.N2.1": {
          code: "CE1.MA.N2.1",
          titre: "Comprendre et utiliser les fractions unitaires (1/2, 1/3, 1/4)",
          description: "Introduire la notion de fraction simple",
          prerequis_cp: ["CP.MA.N2.1", "CP.MA.GM1.1"],
          prerequis_details: [
            "Comprendre les mots : moitié, demi, quart",
            "Utiliser la bande-unité"
          ],
          nouveaute: "Introduction des fractions unitaires",
          evaluation: "Manipulation et utilisation de fractions simples"
        },
        "CE1.MA.N2.2": {
          code: "CE1.MA.N2.2",
          titre: "Additionner et soustraire des fractions de même dénominateur",
          description: "Effectuer des calculs avec des fractions simples",
          prerequis_cp: ["CP.MA.N2.1", "CP.MA.C1.1"],
          prerequis_details: [
            "Comprendre les mots : moitié, demi, quart",
            "Maîtriser l'addition simple"
          ],
          nouveaute: "Calculs avec des fractions",
          evaluation: "Exercices de calculs fractionnaires"
        }
      },
      calcul: {
        "CE1.MA.C1.1": {
          code: "CE1.MA.C1.1",
          titre: "Mémoriser les tables d'addition",
          description: "Automatiser les résultats des additions jusqu'à 20",
          prerequis_cp: ["CP.MA.C1.1", "CP.MA.C1.2"],
          prerequis_details: [
            "Décomposer les nombres jusqu'à 10",
            "Addition dans les nombres jusqu'à 20"
          ],
          saut_qualitatif: "Automatisation des tables d'addition",
          evaluation: "Tests de rapidité sur les tables d'addition"
        },
        "CE1.MA.C1.2": {
          code: "CE1.MA.C1.2",
          titre: "Maîtriser l'algorithme posé de la soustraction avec retenue",
          description: "Effectuer des soustractions en colonnes avec retenue",
          prerequis_cp: ["CP.MA.C1.3", "CP.MA.C1.4"],
          prerequis_details: [
            "Comprendre la soustraction",
            "Soustraction sans retenue"
          ],
          nouveaute: "Introduction de la retenue dans la soustraction",
          evaluation: "Soustractions posées avec retenue"
        },
        "CE1.MA.C2.1": {
          code: "CE1.MA.C2.1",
          titre: "Comprendre le sens de la multiplication et de la division",
          description: "Découvrir les opérations de multiplication et division",
          prerequis_cp: ["CP.MA.C2.1", "CP.MA.C2.2"],
          prerequis_details: [
            "Découvrir les 4 opérations",
            "Résoudre des problèmes simples"
          ],
          nouveaute: "Introduction de la multiplication et division",
          evaluation: "Résolution de problèmes multiplicatifs et de partage"
        },
        "CE1.MA.C3.1": {
          code: "CE1.MA.C3.1",
          titre: "Développer la fluence en calcul mental",
          description: "Améliorer la rapidité et l'efficacité du calcul mental",
          prerequis_cp: ["CP.MA.C3.1", "CP.MA.C3.2"],
          prerequis_details: [
            "Calcul mental quotidien",
            "Automatisation des faits numériques"
          ],
          saut_qualitatif: "Amélioration de la fluence en calcul mental",
          evaluation: "Tests de calcul mental chronométrés"
        }
      },
      problemes: {
        "CE1.MA.P1.1": {
          code: "CE1.MA.P1.1",
          titre: "Résoudre au moins 10 problèmes par semaine",
          description: "S'entraîner régulièrement à la résolution de problèmes",
          prerequis_cp: ["CP.MA.P1.1", "CP.MA.P1.2"],
          prerequis_details: [
            "Résoudre des problèmes simples",
            "Comprendre l'énoncé d'un problème"
          ],
          saut_qualitatif: "Augmentation du volume de problèmes résolus",
          donnees_chiffrees: { objectif_semaine: 10 },
          evaluation: "Suivi du nombre de problèmes résolus par semaine"
        },
        "CE1.MA.P1.2": {
          code: "CE1.MA.P1.2",
          titre: "Modéliser une situation par schémas ou dessins",
          description: "Représenter visuellement les situations mathématiques",
          prerequis_cp: ["CP.MA.P1.3", "CP.MA.P1.4"],
          prerequis_details: [
            "Représenter une situation",
            "Faire le lien entre manipulation et abstraction"
          ],
          saut_qualitatif: "Passage de représentations simples à des modélisations",
          evaluation: "Création de schémas pour résoudre des problèmes"
        },
        "CE1.MA.P2.1": {
          code: "CE1.MA.P2.1",
          titre: "Résoudre des problèmes multiplicatifs et de partage",
          description: "Traiter des problèmes impliquant multiplication et division",
          prerequis_cp: ["CP.MA.P2.1", "CP.MA.C2.1"],
          prerequis_details: [
            "Problèmes additifs et soustractifs",
            "Découvrir les 4 opérations"
          ],
          nouveaute: "Introduction des problèmes multiplicatifs et de partage",
          evaluation: "Résolution de problèmes multiplicatifs"
        }
      },
      grandeurs_mesures: {
        "CE1.MA.GM1.1": {
          code: "CE1.MA.GM1.1",
          titre: "Utiliser les unités : mètre, centimètre, kilomètre",
          description: "Mesurer et comparer des longueurs avec différentes unités",
          prerequis_cp: ["CP.MA.GM1.1", "CP.MA.GM1.2"],
          prerequis_details: [
            "Manipulation concrète des longueurs",
            "Comparer des longueurs"
          ],
          nouveaute: "Introduction des unités de mesure standardisées",
          evaluation: "Mesures de longueurs avec différentes unités"
        },
        "CE1.MA.GM1.2": {
          code: "CE1.MA.GM1.2",
          titre: "Utiliser les unités : gramme, kilogramme",
          description: "Mesurer et comparer des masses",
          prerequis_cp: ["CP.MA.GM1.3", "CP.MA.GM1.4"],
          prerequis_details: [
            "Manipulation concrète des masses",
            "Comparer des masses"
          ],
          nouveaute: "Introduction des unités de masse",
          evaluation: "Mesures de masses avec gramme et kilogramme"
        },
        "CE1.MA.GM2.1": {
          code: "CE1.MA.GM2.1",
          titre: "Lire l'heure (heures, demi-heures, quarts d'heure)",
          description: "Lire et écrire l'heure sur une horloge analogique",
          prerequis_cp: ["CP.MA.GM2.1", "CP.MA.N2.1"],
          prerequis_details: [
            "Comprendre la notion de temps",
            "Comprendre les mots : moitié, demi, quart"
          ],
          nouveaute: "Lecture de l'heure sur horloge analogique",
          evaluation: "Lecture et écriture de l'heure"
        },
        "CE1.MA.GM3.1": {
          code: "CE1.MA.GM3.1",
          titre: "Manipuler la monnaie et comprendre l'écriture à virgule",
          description: "Utiliser la monnaie et comprendre les nombres décimaux",
          prerequis_cp: ["CP.MA.GM3.1", "CP.MA.GM3.2"],
          prerequis_details: [
            "Connaître les pièces et billets",
            "Faire des équivalences monétaires"
          ],
          nouveaute: "Introduction de l'écriture décimale",
          evaluation: "Manipulation de monnaie et écriture décimale"
        }
      },
      espace_geometrie: {
        "CE1.MA.EG1.1": {
          code: "CE1.MA.EG1.1",
          titre: "Reconnaître les figures planes : carré, rectangle, triangle, cercle",
          description: "Identifier et décrire les figures géométriques de base",
          prerequis_cp: ["CP.MA.EG1.1", "CP.MA.EG1.2"],
          prerequis_details: [
            "Premières représentations géométriques",
            "Distinguer les formes"
          ],
          saut_qualitatif: "Passage de formes générales à des figures géométriques précises",
          evaluation: "Reconnaissance et description de figures planes"
        },
        "CE1.MA.EG1.2": {
          code: "CE1.MA.EG1.2",
          titre: "Comprendre la notion d'angle droit",
          description: "Reconnaître et identifier les angles droits",
          prerequis_cp: ["CP.MA.EG1.3", "CP.MA.EG1.4"],
          prerequis_details: [
            "Repérer les alignements",
            "Utiliser la règle"
          ],
          nouveaute: "Introduction de la notion d'angle droit",
          evaluation: "Identification d'angles droits dans l'environnement"
        },
        "CE1.MA.EG2.1": {
          code: "CE1.MA.EG2.1",
          titre: "Identifier les solides : cube, pavé droit, cylindre, boule",
          description: "Reconnaître et décrire les solides de base",
          prerequis_cp: ["CP.MA.EG2.1", "CP.MA.EG2.2"],
          prerequis_details: [
            "Assemblage de solides",
            "Manipulation d'objets 3D"
          ],
          nouveaute: "Introduction des solides géométriques",
          evaluation: "Reconnaissance et description de solides"
        },
        "CE1.MA.EG3.1": {
          code: "CE1.MA.EG3.1",
          titre: "Reproduire des figures simples sur quadrillage",
          description: "Reproduire des figures géométriques sur un support quadrillé",
          prerequis_cp: ["CP.MA.EG3.1", "CP.MA.EG3.2"],
          prerequis_details: [
            "Se repérer sur quadrillage",
            "Déplacement sur quadrillage"
          ],
          saut_qualitatif: "Passage du repérage à la reproduction de figures",
          evaluation: "Reproduction de figures sur quadrillage"
        }
      },
      organisation_donnees: {
        "CE1.MA.OGD1.1": {
          code: "CE1.MA.OGD1.1",
          titre: "Lire et interpréter des tableaux et graphiques",
          description: "Extraire des informations à partir de représentations graphiques",
          prerequis_cp: ["CP.MA.OGD1.1", "CP.MA.OGD1.2"],
          prerequis_details: [
            "Organiser des données en tableau",
            "Construire des graphiques simples"
          ],
          saut_qualitatif: "Passage de la construction à l'interprétation de graphiques",
          evaluation: "Lecture et interprétation de tableaux et graphiques"
        },
        "CE1.MA.OGD1.2": {
          code: "CE1.MA.OGD1.2",
          titre: "Interpréter des diagrammes en barres",
          description: "Comprendre et analyser des diagrammes en barres",
          prerequis_cp: ["CP.MA.OGD1.3", "CP.MA.OGD1.4"],
          prerequis_details: [
            "Diagramme en barres : 1 cube = 1 individu",
            "Extraire des informations d'un graphique"
          ],
          saut_qualitatif: "Passage de diagrammes simples à des diagrammes en barres",
          evaluation: "Interprétation de diagrammes en barres"
        },
        "CE1.MA.OGD2.1": {
          code: "CE1.MA.OGD2.1",
          titre: "Utiliser les droites graduées",
          description: "Se repérer et placer des nombres sur une droite graduée",
          prerequis_cp: ["CP.MA.OGD2.1", "CP.MA.N1.2"],
          prerequis_details: [
            "Découvrir les droites graduées",
            "Placer un nombre sur une ligne graduée - 84,7% maîtrise"
          ],
          saut_qualitatif: "Passage de la découverte à l'utilisation des droites graduées",
          evaluation: "Utilisation de droites graduées pour placer des nombres"
        }
      }
    }
  }
};

// Helper functions
export function getAllCE1CompetenceCodes(): string[] {
  const codes: string[] = [];
  
  // French competences
  Object.values(CE1_COMPETENCES_2025.competences.francais).forEach(domain => {
    Object.keys(domain).forEach(code => codes.push(code));
  });
  
  // Mathematics competences
  Object.values(CE1_COMPETENCES_2025.competences.mathematiques).forEach(domain => {
    Object.keys(domain).forEach(code => codes.push(code));
  });
  
  return codes;
}

export function getCE1CompetenceByCode(code: string): CE1CompetenceData | null {
  // Search in French competences
  Object.values(CE1_COMPETENCES_2025.competences.francais).forEach(domain => {
    if (domain[code]) return domain[code];
  });
  
  // Search in Mathematics competences
  Object.values(CE1_COMPETENCES_2025.competences.mathematiques).forEach(domain => {
    if (domain[code]) return domain[code];
  });
  
  return null;
}

export function getCE1PrerequisitesForCompetence(code: string): string[] {
  const competence = getCE1CompetenceByCode(code);
  return competence?.prerequis_cp || [];
}

export function hasCE1MajorQualitativeLeap(code: string): boolean {
  const competence = getCE1CompetenceByCode(code);
  return !!competence?.saut_qualitatif;
}

export function getCE1CompetencesWithMajorLeaps(): CE1CompetenceData[] {
  const leaps: CE1CompetenceData[] = [];
  
  Object.values(CE1_COMPETENCES_2025.competences.francais).forEach(domain => {
    Object.values(domain).forEach(competence => {
      if (competence.saut_qualitatif) leaps.push(competence);
    });
  });
  
  Object.values(CE1_COMPETENCES_2025.competences.mathematiques).forEach(domain => {
    Object.values(domain).forEach(competence => {
      if (competence.saut_qualitatif) leaps.push(competence);
    });
  });
  
  return leaps;
}

export function getCE1CompetencesByDomain(domain: string): CE1CompetenceData[] {
  const competences: CE1CompetenceData[] = [];
  
  if (domain === 'francais') {
    Object.values(CE1_COMPETENCES_2025.competences.francais).forEach(subDomain => {
      Object.values(subDomain).forEach(competence => competences.push(competence));
    });
  } else if (domain === 'mathematiques') {
    Object.values(CE1_COMPETENCES_2025.competences.mathematiques).forEach(subDomain => {
      Object.values(subDomain).forEach(competence => competences.push(competence));
    });
  }
  
  return competences;
}
