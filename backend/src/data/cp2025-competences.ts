export const competenceReference = {
  // FRANÇAIS - LECTURE
  'CP.FR.L1.1': {
    titre: 'Maîtriser les 15 CGP de la Période 1',
    description: 'Correspondances Graphème-Phonème de base (voyelles + consonnes)',
    periode: 'P1',
    prerequis: [],
    objectifs: ['Reconnaître les voyelles a, e, i, o, u', 'Identifier les consonnes m, n, p, t, r, l, s']
  },
  'CP.FR.L1.2': {
    titre: 'Maîtriser les 25-30 CGP supplémentaires de la Période 2',
    description: 'Extension des correspondances graphème-phonème',
    periode: 'P2',
    prerequis: ['CP.FR.L1.1'],
    objectifs: ['Reconnaître consonnes b, d, f, g, h, j, k, q, v, w, x, y, z', 'Identifier digraphes simples']
  },
  'CP.FR.L1.3': {
    titre: 'Maîtriser consonnes complexes et voyelles nasales',
    description: 'Sons complexes de la Période 3',
    periode: 'P3',
    prerequis: ['CP.FR.L1.2'],
    objectifs: ['Reconnaître ch, ou, an, in, on', 'Distinguer voyelles nasales']
  },
  'CP.FR.L1.4': {
    titre: 'Maîtriser les digraphes complexes',
    description: 'Sons complexes de la Période 4',
    periode: 'P4',
    prerequis: ['CP.FR.L1.3'],
    objectifs: ['Reconnaître eau, tion, ph, gn', 'Identifier les sons complexes']
  },
  'CP.FR.L1.5': {
    titre: 'Maîtriser les graphèmes complexes finaux',
    description: 'Sons complexes de la Période 5',
    periode: 'P5',
    prerequis: ['CP.FR.L1.4'],
    objectifs: ['Reconnaître ail, euil, oe, oeu', 'Maîtriser les graphèmes complexes']
  },
  
  // FRANÇAIS - SYLLABATION
  'CP.FR.L2.1': {
    titre: 'Segmenter les mots en syllabes',
    description: 'Décomposition syllabique simple',
    periode: 'P1',
    prerequis: ['CP.FR.L1.1'],
    objectifs: ['Identifier les syllabes dans les mots simples', 'Compter les syllabes']
  },
  'CP.FR.L2.2': {
    titre: 'Maîtriser la syllabation CV',
    description: 'Syllabes consonne-voyelle',
    periode: 'P2',
    prerequis: ['CP.FR.L2.1'],
    objectifs: ['Former des syllabes CV', 'Lire des syllabes CV']
  },
  'CP.FR.L2.3': {
    titre: 'Maîtriser la syllabation CVC',
    description: 'Syllabes consonne-voyelle-consonne',
    periode: 'P3',
    prerequis: ['CP.FR.L2.2'],
    objectifs: ['Former des syllabes CVC', 'Lire des syllabes CVC']
  },
  
  // FRANÇAIS - FLUENCE
  'CP.FR.L3.1': {
    titre: 'Lire des mots isolés',
    description: 'Lecture de mots simples',
    periode: 'P2',
    prerequis: ['CP.FR.L1.2', 'CP.FR.L2.2'],
    objectifs: ['Lire des mots de 2-3 syllabes', 'Automatiser la lecture']
  },
  'CP.FR.L3.2': {
    titre: 'Lire des phrases simples',
    description: 'Lecture de phrases courtes',
    periode: 'P3',
    prerequis: ['CP.FR.L3.1'],
    objectifs: ['Lire des phrases de 3-5 mots', 'Respecter la ponctuation']
  },
  'CP.FR.L3.3': {
    titre: 'Lire des textes courts',
    description: 'Lecture de textes simples',
    periode: 'P4',
    prerequis: ['CP.FR.L3.2'],
    objectifs: ['Lire des textes de 2-3 phrases', 'Comprendre le sens']
  },
  
  // FRANÇAIS - ÉCRITURE
  'CP.FR.E1.1': {
    titre: 'Maîtriser l\'écriture cursive sur réglure 3mm',
    description: 'Formation correcte des lettres en cursive',
    periode: 'P1',
    prerequis: [],
    objectifs: ['Former lettres minuscules', 'Respecter les lignes de réglure']
  },
  'CP.FR.E1.2': {
    titre: 'Maîtriser l\'écriture des majuscules',
    description: 'Formation des lettres majuscules',
    periode: 'P2',
    prerequis: ['CP.FR.E1.1'],
    objectifs: ['Former lettres majuscules', 'Utiliser les majuscules']
  },
  'CP.FR.E2.1': {
    titre: 'Écrire des mots simples',
    description: 'Écriture de mots dictés',
    periode: 'P2',
    prerequis: ['CP.FR.L1.2', 'CP.FR.E1.1'],
    objectifs: ['Écrire des mots de 2-3 syllabes', 'Respecter l\'orthographe']
  },
  'CP.FR.E2.2': {
    titre: 'Écrire des phrases simples',
    description: 'Écriture de phrases dictées',
    periode: 'P3',
    prerequis: ['CP.FR.E2.1'],
    objectifs: ['Écrire des phrases de 3-5 mots', 'Respecter la ponctuation']
  },
  
  // FRANÇAIS - COMPRÉHENSION
  'CP.FR.C1.1': {
    titre: 'Comprendre des mots isolés',
    description: 'Compréhension lexicale',
    periode: 'P2',
    prerequis: ['CP.FR.L1.2'],
    objectifs: ['Comprendre le sens des mots', 'Associer mot et image']
  },
  'CP.FR.C1.2': {
    titre: 'Comprendre des phrases simples',
    description: 'Compréhension de phrases',
    periode: 'P3',
    prerequis: ['CP.FR.C1.1', 'CP.FR.L3.2'],
    objectifs: ['Comprendre le sens des phrases', 'Répondre à des questions']
  },
  'CP.FR.C1.3': {
    titre: 'Comprendre des textes courts',
    description: 'Compréhension de textes',
    periode: 'P4',
    prerequis: ['CP.FR.C1.2', 'CP.FR.L3.3'],
    objectifs: ['Comprendre le sens des textes', 'Identifier les personnages']
  },
  
  // MATHÉMATIQUES - NOMBRES
  'CP.MA.N1.1': {
    titre: 'Maîtriser nombres 0-10',
    description: 'Écriture, lecture et ordre des nombres jusqu\'à 10',
    periode: 'P1',
    prerequis: [],
    objectifs: ['Compter jusqu\'à 10', 'Écrire chiffres 0-10', 'Ordonner nombres']
  },
  'CP.MA.N1.2': {
    titre: 'Maîtriser nombres 11-20',
    description: 'Extension aux nombres de 11 à 20',
    periode: 'P1',
    prerequis: ['CP.MA.N1.1'],
    objectifs: ['Compter jusqu\'à 20', 'Comprendre dizaine/unités']
  },
  'CP.MA.N1.3': {
    titre: 'Maîtriser nombres 21-59',
    description: 'Nombres de 21 à 59',
    periode: 'P2',
    prerequis: ['CP.MA.N1.2'],
    objectifs: ['Compter jusqu\'à 59', 'Écrire les nombres']
  },
  'CP.MA.N1.4': {
    titre: 'Maîtriser nombres 60-100',
    description: 'Nombres de 60 à 100',
    periode: 'P3',
    prerequis: ['CP.MA.N1.3'],
    objectifs: ['Compter jusqu\'à 100', 'Comprendre la numération']
  },
  
  // MATHÉMATIQUES - CALCUL MENTAL
  'CP.MA.N3.1': {
    titre: 'Automatiser additions dans les 10',
    description: 'Calcul mental rapide pour additions simples',
    periode: 'P2',
    prerequis: ['CP.MA.N1.1'],
    objectifs: ['Calculer mentalement a+b ≤ 10', 'Mémoriser compléments à 10']
  },
  'CP.MA.N3.2': {
    titre: 'Automatiser soustractions dans les 10',
    description: 'Calcul mental pour soustractions simples',
    periode: 'P3',
    prerequis: ['CP.MA.N3.1'],
    objectifs: ['Calculer mentalement a-b ≥ 0', 'Comprendre la soustraction']
  },
  'CP.MA.N3.3': {
    titre: 'Automatiser additions et soustractions dans les 20',
    description: 'Calcul mental étendu',
    periode: 'P4',
    prerequis: ['CP.MA.N3.2', 'CP.MA.N1.2'],
    objectifs: ['Calculer mentalement dans les 20', 'Automatiser les calculs']
  },
  
  // MATHÉMATIQUES - PROBLÈMES
  'CP.MA.P1.1': {
    titre: 'Résoudre des problèmes additifs simples',
    description: 'Problèmes d\'addition dans les 10',
    periode: 'P2',
    prerequis: ['CP.MA.N3.1'],
    objectifs: ['Identifier les problèmes d\'addition', 'Résoudre des problèmes simples']
  },
  'CP.MA.P1.2': {
    titre: 'Résoudre des problèmes soustractifs simples',
    description: 'Problèmes de soustraction dans les 10',
    periode: 'P3',
    prerequis: ['CP.MA.P1.1', 'CP.MA.N3.2'],
    objectifs: ['Identifier les problèmes de soustraction', 'Résoudre des problèmes']
  },
  'CP.MA.P1.3': {
    titre: 'Résoudre des problèmes variés dans les 20',
    description: 'Problèmes additifs et soustractifs',
    periode: 'P4',
    prerequis: ['CP.MA.P1.2', 'CP.MA.N3.3'],
    objectifs: ['Résoudre des problèmes variés', 'Choisir l\'opération appropriée']
  },
  
  // MATHÉMATIQUES - GÉOMÉTRIE
  'CP.MA.G1.1': {
    titre: 'Reconnaître et nommer les formes géométriques',
    description: 'Formes planes de base',
    periode: 'P2',
    prerequis: [],
    objectifs: ['Reconnaître carré, rectangle, triangle, cercle', 'Nommer les formes']
  },
  'CP.MA.G1.2': {
    titre: 'Reproduire des figures géométriques',
    description: 'Reproduction de figures simples',
    periode: 'P3',
    prerequis: ['CP.MA.G1.1'],
    objectifs: ['Reproduire des figures', 'Utiliser les instruments']
  },
  'CP.MA.G1.3': {
    titre: 'Construire des figures géométriques',
    description: 'Construction de figures',
    periode: 'P4',
    prerequis: ['CP.MA.G1.2'],
    objectifs: ['Construire des figures', 'Respecter les consignes']
  },
  
  // MATHÉMATIQUES - MESURES
  'CP.MA.M1.1': {
    titre: 'Comparer des longueurs',
    description: 'Comparaison directe de longueurs',
    periode: 'P3',
    prerequis: [],
    objectifs: ['Comparer des longueurs', 'Utiliser le vocabulaire']
  },
  'CP.MA.M1.2': {
    titre: 'Mesurer des longueurs avec des unités non conventionnelles',
    description: 'Mesure avec des unités personnelles',
    periode: 'P4',
    prerequis: ['CP.MA.M1.1'],
    objectifs: ['Mesurer avec des unités', 'Comparer des mesures']
  },
  'CP.MA.M1.3': {
    titre: 'Mesurer des longueurs avec le mètre',
    description: 'Mesure avec le mètre',
    periode: 'P5',
    prerequis: ['CP.MA.M1.2'],
    objectifs: ['Utiliser le mètre', 'Mesurer des objets']
  }
}; 