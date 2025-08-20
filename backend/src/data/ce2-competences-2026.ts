export interface CompetencePrerequisite {
  competenceCode: string;
  prerequisiteCode: string;
  weight: number;
  description: string;
}

export interface CompetenceData {
  code: string;
  titre: string;
  description: string;
  prerequis_ce1: string[];
  prerequis_details: string[];
  saut_qualitatif?: string;
  nouveaute?: string;
  evaluation: string;
  donnees_chiffrees?: Record<string, any>;
}

export interface CompetenceDomain {
  [competenceCode: string]: CompetenceData;
}

export interface CompetenceFramework {
  niveau: string;
  annee_application: string;
  competences: {
    francais: {
      oral: CompetenceDomain;
      lecture: CompetenceDomain;
      ecriture: CompetenceDomain;
      vocabulaire: CompetenceDomain;
      grammaire: CompetenceDomain;
      orthographe: CompetenceDomain;
    };
    mathematiques: {
      nombres: CompetenceDomain;
      calcul: CompetenceDomain;
      problemes: CompetenceDomain;
      grandeurs_mesures: CompetenceDomain;
      espace_geometrie: CompetenceDomain;
      organisation_donnees: CompetenceDomain;
    };
  };
}

// CE2 Competence Framework 2026-2027
export const CE2_COMPETENCES_2026: CompetenceFramework = {
  niveau: "CE2",
  annee_application: "2026-2027",
  competences: {
    francais: {
      oral: {
        "CE2.FR.O.1.1": {
          code: "CE2.FR.O.1.1",
          titre: "Comprendre des textes entendus complexes",
          description: "Extraire informations explicites et implicites de textes lus par l'adulte, maintenir attention sur écoutes longues et complexes",
          prerequis_ce1: ["CE1.FR.O1.1", "CE1.FR.O1.2"],
          prerequis_details: [
            "Maintenir une attention orientée en fonction d'un but lors d'écoutes longues",
            "Repérer et mémoriser des informations importantes dans un texte entendu"
          ],
          saut_qualitatif: "Passage de la compréhension linéaire aux inférences complexes",
          evaluation: "Questionnaires de compréhension, restitution d'informations"
        },
        "CE2.FR.O.2.1": {
          code: "CE2.FR.O.2.1",
          titre: "S'exprimer avec précision et structure",
          description: "Utiliser vocabulaire approprié, structurer ses propos, présenter un travail ou expliquer une règle",
          prerequis_ce1: ["CE1.FR.O2.1", "CE1.FR.O2.2"],
          prerequis_details: [
            "Organiser son discours pour expliquer une règle ou présenter un travail",
            "Réciter un texte mémorisé avec une expression adaptée"
          ],
          saut_qualitatif: "Structuration avancée du discours oral",
          evaluation: "Présentations orales courtes, lectures théâtralisées"
        },
        "CE2.FR.O.3.1": {
          code: "CE2.FR.O.3.1",
          titre: "Participer à des échanges diversifiés",
          description: "Écouter interviews, débats, présentations orales, lectures théâtrales - diversification des supports",
          prerequis_ce1: ["CE1.FR.O2.1"],
          prerequis_details: [
            "Organiser son discours pour expliquer une règle ou présenter un travail"
          ],
          nouveaute: "Introduction de nouveaux types d'échanges (interviews, débats)",
          evaluation: "Participation active aux échanges, qualité des interventions"
        }
      },
      lecture: {
        "CE2.FR.L.1.1": {
          code: "CE2.FR.L.1.1",
          titre: "Lire avec fluence experte - 90 mots/minute",
          description: "Atteindre 90 mots par minute en fin d'année (MCLM), automatisation complète du décodage",
          prerequis_ce1: ["CE1.FR.L1.2"],
          prerequis_details: [
            "Lire avec une fluence de 70 mots par minute"
          ],
          saut_qualitatif: "Passage de 70 à 90 mots/minute",
          evaluation: "Tests MCLM, seuils critiques nationaux",
          donnees_chiffrees: {
            objectif_fin_annee: "90 mots/minute",
            seuil_alerte: "moins de 30 mots/minute",
            seuil_fragile: "30-69 mots/minute"
          }
        },
        "CE2.FR.L.1.2": {
          code: "CE2.FR.L.1.2",
          titre: "Automatisation complète du décodage",
          description: "Maîtrise automatique de tous les graphèmes complexes, décodage sans effort conscient",
          prerequis_ce1: ["CE1.FR.L1.1"],
          prerequis_details: [
            "Identifier automatiquement les mots avec syllabes complexes"
          ],
          saut_qualitatif: "Automatisation totale libérant les ressources cognitives pour la compréhension",
          evaluation: "Vitesse et précision de décodage de mots complexes"
        },
        "CE2.FR.L.2.1": {
          code: "CE2.FR.L.2.1",
          titre: "Comprendre textes complexes en autonomie",
          description: "Comprendre textes narratifs et informatifs longs, réaliser inférences complexes, nouveaux genres (théâtre)",
          prerequis_ce1: ["CE1.FR.L2.1", "CE1.FR.L2.2"],
          prerequis_details: [
            "Comprendre un texte d'une vingtaine de lignes lu en autonomie",
            "Réaliser des inférences complexes à partir d'un texte"
          ],
          nouveaute: "Introduction des pièces de théâtre",
          saut_qualitatif: "Analyse fine de textes complexes incluant de nouveaux genres",
          evaluation: "Questionnaires de compréhension, analyse de personnages"
        }
      },
      ecriture: {
        "CE2.FR.E.1.1": {
          code: "CE2.FR.E.1.1",
          titre: "Perfectionnement du geste graphique",
          description: "Perfectionnement endurance et rapidité, copie guidée efficace, majuscules cursives affinées",
          prerequis_ce1: ["CE1.FR.E1.1", "CE1.FR.E1.2"],
          prerequis_details: [
            "Tracer toutes les majuscules cursives",
            "Copier une dizaine de lignes sans erreur"
          ],
          saut_qualitatif: "Perfectionnement de l'endurance et rapidité d'écriture",
          evaluation: "Vitesse et qualité de copie, tenue du crayon"
        },
        "CE2.FR.E.2.1": {
          code: "CE2.FR.E.2.1",
          titre: "Production d'écrits structurés - 10 lignes",
          description: "Écrire un texte de 10 lignes avec méthodologie complète (planification, brouillon, révision, écriture au propre)",
          prerequis_ce1: ["CE1.FR.E2.1", "CE1.FR.E2.2"],
          prerequis_details: [
            "Rédiger des textes de plusieurs phrases en autonomie",
            "Utiliser des connecteurs temporels (d'abord, puis, ensuite, enfin)"
          ],
          saut_qualitatif: "Passage à l'autonomie créative structurée avec méthodologie complète",
          donnees_chiffrees: {
            objectif_fin_cycle: "10 lignes",
            prerequis_ce1: "3-5 lignes"
          },
          evaluation: "Production de textes narratifs, descriptifs, explicatifs"
        }
      },
      vocabulaire: {
        "CE2.FR.V.1.1": {
          code: "CE2.FR.V.1.1",
          titre: "Intensification du travail lexical - 30 corpus/an",
          description: "6 corpus par période (30 corpus/an), enrichissement systématique du vocabulaire",
          prerequis_ce1: ["CE1.FR.V1.1"],
          prerequis_details: [
            "Enrichir les corolles lexicales constituées au CP"
          ],
          evaluation: "Réinvestissement en production, tests de vocabulaire"
        },
        "CE2.FR.V.2.1": {
          code: "CE2.FR.V.2.1",
          titre: "Morphologie lexicale avancée",
          description: "Préfixes, suffixes, familles de mots, analogies morphologiques, formation des mots",
          prerequis_ce1: ["CE1.FR.V1.2"],
          prerequis_details: [
            "Trouver des synonymes, antonymes et mots de même famille"
          ],
          saut_qualitatif: "Analyse morphologique des mots pour comprendre leur formation",
          evaluation: "Exercices de décomposition, création de mots"
        },
        "CE2.FR.V.3.1": {
          code: "CE2.FR.V.3.1",
          titre: "Complexification du sens",
          description: "Sens propre/figuré, polysémie, contexte, usage autonome du dictionnaire",
          prerequis_ce1: ["CE1.FR.V2.1"],
          prerequis_details: [
            "Consulter un dictionnaire et se repérer dans un article"
          ],
          nouveaute: "Introduction sens propre/figuré et polysémie",
          evaluation: "Reconnaissance des différents sens, usage contextuel"
        }
      },
      grammaire: {
        "CE2.FR.G.1.1": {
          code: "CE2.FR.G.1.1",
          titre: "Classes de mots étendues avec adverbes",
          description: "Noms, verbes, déterminants, adjectifs, pronoms personnels sujets + adverbes (nouveauté)",
          prerequis_ce1: ["CE1.FR.G1.1"],
          prerequis_details: [
            "Identifier le sujet et le verbe dans une phrase"
          ],
          nouveaute: "Introduction des adverbes",
          evaluation: "Identification et classification des mots"
        },
        "CE2.FR.G.2.1": {
          code: "CE2.FR.G.2.1",
          titre: "Analyse syntaxique - groupes syntaxiques",
          description: "Reconnaissance groupes syntaxiques (sujet, verbe, compléments), analyse de la phrase",
          prerequis_ce1: ["CE1.FR.G1.1", "CE1.FR.G1.2"],
          prerequis_details: [
            "Identifier le sujet et le verbe dans une phrase",
            "Différencier les 3 types de phrases (déclaratives, interrogatives, impératives)"
          ],
          saut_qualitatif: "Passage de l'identification à l'analyse syntaxique",
          evaluation: "Analyse de phrases, schémas syntaxiques"
        },
        "CE2.FR.G.3.1": {
          code: "CE2.FR.G.3.1",
          titre: "Chaînes d'accords consolidées",
          description: "Accords nom/adjectif, verbe/sujet consolidés et automatisés, chaînes d'accords complexes",
          prerequis_ce1: ["CE1.FR.G2.1", "CE1.FR.G2.2"],
          prerequis_details: [
            "Réaliser des accords en genre et nombre dans le groupe nominal",
            "Conjuguer être, avoir et verbes du 1er groupe aux temps étudiés"
          ],
          saut_qualitatif: "Automatisation et complexification des chaînes d'accords",
          evaluation: "Dictées, exercices d'accord"
        }
      },
      orthographe: {
        "CE2.FR.O.1.1": {
          code: "CE2.FR.O.1.1",
          titre: "Extension verbes et temps - 8 verbes irréguliers",
          description: "Être, avoir, verbes 1er groupe + 8 verbes irréguliers (aller, dire, faire, venir, voir, prendre, vouloir, pouvoir). Temps : présent, imparfait, futur, passé composé",
          prerequis_ce1: ["CE1.FR.G2.2", "CE1.FR.G2.3"],
          prerequis_details: [
            "Conjuguer être, avoir et verbes du 1er groupe aux temps étudiés",
            "Conjuguer 8 verbes irréguliers du 3e groupe"
          ],
          nouveaute: "Passé composé y compris verbes 3e groupe",
          evaluation: "Conjugaison en contexte, dictées de phrases"
        },
        "CE2.FR.O.2.1": {
          code: "CE2.FR.O.2.1",
          titre: "Orthographe lexicale avec critères morphologiques",
          description: "Orthographe des mots des corpus, utilisation des critères morphologiques pour l'orthographe",
          prerequis_ce1: ["CE1.FR.V3.1"],
          prerequis_details: [
            "Mémoriser un corpus organisé de mots invariables"
          ],
          saut_qualitatif: "Utilisation de stratégies morphologiques",
          evaluation: "Dictées de mots, utilisation en contexte"
        }
      }
    },
    mathematiques: {
      nombres: {
        "CE2.MA.N.1.1": {
          code: "CE2.MA.N.1.1",
          titre: "Extension aux milliers - nombres jusqu'à 10 000",
          description: "Maîtriser les nombres jusqu'à 10 000 dès période 2, gestion des nombres à 4 chiffres",
          prerequis_ce1: ["CE1.MA.N1.1"],
          prerequis_details: [
            "Maîtriser les nombres jusqu'à 1000"
          ],
          saut_qualitatif: "Gestion des nombres à 4 chiffres et positionnement des milliers",
          donnees_chiffrees: {
            ce1: "jusqu'à 1000",
            ce2_periode_2: "jusqu'à 10000"
          },
          evaluation: "Numération, décompositions, comparaisons"
        },
        "CE2.MA.N.2.1": {
          code: "CE2.MA.N.2.1",
          titre: "Écriture décimale avec la monnaie",
          description: "Maîtrise écriture décimale avec la monnaie (ex: 12,35 €) - première introduction de l'écriture à virgule",
          prerequis_ce1: ["CE1.MA.GM3.1"],
          prerequis_details: [
            "Manipuler la monnaie et comprendre l'écriture à virgule"
          ],
          saut_qualitatif: "Première introduction systématique de l'écriture à virgule",
          evaluation: "Manipulations monétaires, écriture décimale"
        },
        "CE2.MA.N.3.1": {
          code: "CE2.MA.N.3.1",
          titre: "Fractions comme mesures de grandeurs",
          description: "Fractions ≤ 1 comme mesures de grandeurs (bande-unité, graduations), passage du partage à la mesure",
          prerequis_ce1: ["CE1.MA.N2.1"],
          prerequis_details: [
            "Comprendre et utiliser les fractions unitaires (1/2, 1/3, 1/4)"
          ],
          saut_qualitatif: "Passage du partage d'objets à la mesure de longueurs",
          evaluation: "Mesures sur bandes graduées, placements sur droites"
        },
        "CE2.MA.N.4.1": {
          code: "CE2.MA.N.4.1",
          titre: "Opérations sur fractions",
          description: "Additionner et soustraire fractions de même dénominateur, passage à l'opératoire",
          prerequis_ce1: ["CE1.MA.N2.2"],
          prerequis_details: [
            "Additionner et soustraire des fractions de même dénominateur"
          ],
          saut_qualitatif: "Passage à l'opératoire sur les fractions",
          evaluation: "Calculs de fractions, résolution de problèmes"
        }
      },
      calcul: {
        "CE2.MA.C.1.1": {
          code: "CE2.MA.C.1.1",
          titre: "Fluence et automatisation complète",
          description: "Tests de fluence en temps limité, automatisation complète des tables 2, 3, 4, 5",
          prerequis_ce1: ["CE1.MA.C1.1"],
          prerequis_details: [
            "Mémoriser les tables d'addition"
          ],
          saut_qualitatif: "Automatisation complète avec contrainte temporelle",
          evaluation: "Tests chronométrés, fluence calculatoire"
        },
        "CE2.MA.C.2.1": {
          code: "CE2.MA.C.2.1",
          titre: "Techniques opératoires avancées",
          description: "Algorithme de multiplication posée (au plus tard période 4), division en ligne",
          prerequis_ce1: ["CE1.MA.C1.2", "CE1.MA.C2.1"],
          prerequis_details: [
            "Maîtriser l'algorithme posé de la soustraction avec retenue",
            "Comprendre le sens de la multiplication et de la division"
          ],
          saut_qualitatif: "Introduction multiplication posée et division comme opération inverse",
          nouveaute: "Algorithme de multiplication posée",
          evaluation: "Calculs posés, résolution d'opérations complexes"
        }
      },
      problemes: {
        "CE2.MA.P.1.1": {
          code: "CE2.MA.P.1.1",
          titre: "Procédure par analogie",
          description: "Reconnaissance de problèmes similaires, transfert de stratégies, méthodologie renforcée",
          prerequis_ce1: ["CE1.MA.P1.1", "CE1.MA.P1.2"],
          prerequis_details: [
            "Résoudre au moins 10 problèmes par semaine",
            "Modéliser une situation par schémas ou dessins"
          ],
          saut_qualitatif: "Reconnaissance de types et transfert de stratégies",
          donnees_chiffrees: {
            taux_reussite_2024: "48%",
            priorite: "absolue"
          },
          evaluation: "Résolution autonome, explicitation des stratégies"
        },
        "CE2.MA.P.2.1": {
          code: "CE2.MA.P.2.1",
          titre: "Typologie élargie - champ additif et multiplicatif",
          description: "Maîtrise de tous les types de problèmes du champ additif et multiplicatif",
          prerequis_ce1: ["CE1.MA.P2.1"],
          prerequis_details: [
            "Résoudre des problèmes multiplicatifs et de partage"
          ],
          saut_qualitatif: "Élargissement à tous les types de problèmes des deux champs",
          evaluation: "Diversité des problèmes résolus, transfert de compétences"
        }
      },
      grandeurs_mesures: {
        "CE2.MA.GM.1.1": {
          code: "CE2.MA.GM.1.1",
          titre: "Longueurs - unités et conversions étendues",
          description: "Introduction du mm, conversions complexes, fractions d'unités",
          prerequis_ce1: ["CE1.MA.GM1.1"],
          prerequis_details: [
            "Utiliser les unités : mètre, centimètre, kilomètre"
          ],
          nouveaute: "Introduction du millimètre",
          saut_qualitatif: "Conversions complexes et fractions d'unités",
          evaluation: "Mesures précises, conversions multiples"
        },
        "CE2.MA.GM.2.1": {
          code: "CE2.MA.GM.2.1",
          titre: "Masses - élargissement aux grandes masses",
          description: "Introduction de la tonne, conversions complexes",
          prerequis_ce1: ["CE1.MA.GM1.2"],
          prerequis_details: [
            "Utiliser les unités : gramme, kilogramme"
          ],
          nouveaute: "Introduction de la tonne",
          evaluation: "Estimations, pesées, conversions"
        },
        "CE2.MA.GM.3.1": {
          code: "CE2.MA.GM.3.1",
          titre: "Monnaie - maîtrise décimale complète",
          description: "Maîtrise complète de l'écriture décimale euros/centimes",
          prerequis_ce1: ["CE1.MA.GM3.1"],
          prerequis_details: [
            "Manipuler la monnaie et comprendre l'écriture à virgule"
          ],
          saut_qualitatif: "Passage de la manipulation séparée à l'écriture décimale unifiée",
          evaluation: "Problèmes monétaires, calculs décimaux"
        }
      },
      espace_geometrie: {
        "CE2.MA.EG.1.1": {
          code: "CE2.MA.EG.1.1",
          titre: "Introduction du losange",
          description: "Reconnaissance, description et propriétés du losange",
          prerequis_ce1: ["CE1.MA.EG1.1"],
          prerequis_details: [
            "Reconnaître les figures planes : carré, rectangle, triangle, cercle"
          ],
          nouveaute: "Le losange comme nouvelle figure",
          evaluation: "Reconnaissance, tracés, propriétés"
        },
        "CE2.MA.EG.2.1": {
          code: "CE2.MA.EG.2.1",
          titre: "Classification des angles",
          description: "Angles aigus et obtus, mesure et reconnaissance, diversification des angles",
          prerequis_ce1: ["CE1.MA.EG1.2"],
          prerequis_details: [
            "Comprendre la notion d'angle droit"
          ],
          saut_qualitatif: "Diversification et classification des angles",
          evaluation: "Reconnaissance, classification, mesures"
        },
        "CE2.MA.EG.3.1": {
          code: "CE2.MA.EG.3.1",
          titre: "Symétrie axiale complète",
          description: "Symétrie axiale complète - concept entièrement nouveau (suppression totale en CE1 programmes 2025)",
          prerequis_ce1: [],
          prerequis_details: [
            "Aucun pré-requis CE1 - concept entièrement nouveau"
          ],
          saut_qualitatif: "Concept géométrique entièrement nouveau",
          nouveaute: "Suppression de la symétrie en CE1 dans les programmes 2025",
          evaluation: "Constructions, reconnaissance, propriétés"
        },
        "CE2.MA.EG.4.1": {
          code: "CE2.MA.EG.4.1",
          titre: "Périmètres des figures usuelles",
          description: "Calcul de périmètres des figures usuelles, mesures de contours",
          prerequis_ce1: ["CE1.MA.EG3.1"],
          prerequis_details: [
            "Reproduire des figures simples sur quadrillage"
          ],
          saut_qualitatif: "Passage de la reproduction au calcul de mesures",
          evaluation: "Calculs de périmètres, problèmes géométriques"
        }
      },
      organisation_donnees: {
        "CE2.MA.OGD.1.1": {
          code: "CE2.MA.OGD.1.1",
          titre: "Exploitation pour résoudre",
          description: "Résolution de problèmes à partir de tableaux et graphiques, autonomie opérationnelle",
          prerequis_ce1: ["CE1.MA.OGD1.1", "CE1.MA.OGD1.2"],
          prerequis_details: [
            "Lire et interpréter des tableaux et graphiques",
            "Interpréter des diagrammes en barres"
          ],
          saut_qualitatif: "Passage de la lecture à l'exploitation pour résoudre",
          evaluation: "Résolution de problèmes avec données graphiques"
        },
        "CE2.MA.OGD.2.1": {
          code: "CE2.MA.OGD.2.1",
          titre: "Construction autonome",
          description: "Construction autonome de graphiques, analyse comparative",
          prerequis_ce1: ["CE1.MA.OGD2.1"],
          prerequis_details: [
            "Utiliser les droites graduées"
          ],
          saut_qualitatif: "Passage de l'utilisation à la construction autonome",
          evaluation: "Création de graphiques, comparaisons de données"
        }
      }
    }
  }
};

// Generate prerequisite relationships for database seeding
export function generatePrerequisites(): CompetencePrerequisite[] {
  const prerequisites: CompetencePrerequisite[] = [];
  
  // Helper function to add prerequisites for a competence
  function addPrerequisites(competenceCode: string, prerequisCodes: string[]) {
    prerequisCodes.forEach((prereqCode, index) => {
      prerequisites.push({
        competenceCode,
        prerequisiteCode: prereqCode,
        weight: 1.0 - (index * 0.1), // First prerequisite has highest weight
        description: `Prérequis CE1 pour ${competenceCode}`
      });
    });
  }
  
  // Add all prerequisites from the framework
  Object.values(CE2_COMPETENCES_2026.competences.francais).forEach(domain => {
    Object.values(domain).forEach(competence => {
      if (competence.prerequis_ce1.length > 0) {
        addPrerequisites(competence.code, competence.prerequis_ce1);
      }
    });
  });
  
  Object.values(CE2_COMPETENCES_2026.competences.mathematiques).forEach(domain => {
    Object.values(domain).forEach(competence => {
      if (competence.prerequis_ce1.length > 0) {
        addPrerequisites(competence.code, competence.prerequis_ce1);
      }
    });
  });
  
  return prerequisites;
}

// Get all competence codes
export function getAllCompetenceCodes(): string[] {
  const codes: string[] = [];
  
  Object.values(CE2_COMPETENCES_2026.competences.francais).forEach(domain => {
    Object.values(domain).forEach(competence => {
      codes.push(competence.code);
    });
  });
  
  Object.values(CE2_COMPETENCES_2026.competences.mathematiques).forEach(domain => {
    Object.values(domain).forEach(competence => {
      codes.push(competence.code);
    });
  });
  
  return codes;
}

// Get competence by code
export function getCompetenceByCode(code: string): CompetenceData | null {
  const allDomains = {
    ...CE2_COMPETENCES_2026.competences.francais,
    ...CE2_COMPETENCES_2026.competences.mathematiques
  };
  
  for (const domain of Object.values(allDomains)) {
    if (domain[code]) {
      return domain[code];
    }
  }
  
  return null;
}

// Get prerequisites for a competence
export function getPrerequisitesForCompetence(code: string): string[] {
  const competence = getCompetenceByCode(code);
  return competence?.prerequis_ce1 || [];
}

// Check if a competence has major qualitative leaps
export function hasMajorQualitativeLeap(code: string): boolean {
  const competence = getCompetenceByCode(code);
  return !!(competence?.saut_qualitatif || competence?.nouveaute);
}

// Get competences with major qualitative leaps
export function getCompetencesWithMajorLeaps(): CompetenceData[] {
  const leaps: CompetenceData[] = [];
  
  Object.values(CE2_COMPETENCES_2026.competences.francais).forEach(domain => {
    Object.values(domain).forEach(competence => {
      if (hasMajorQualitativeLeap(competence.code)) {
        leaps.push(competence);
      }
    });
  });
  
  Object.values(CE2_COMPETENCES_2026.competences.mathematiques).forEach(domain => {
    Object.values(domain).forEach(competence => {
      if (hasMajorQualitativeLeap(competence.code)) {
        leaps.push(competence);
      }
    });
  });
  
  return leaps;
}
