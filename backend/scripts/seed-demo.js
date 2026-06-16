const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { Client } = require('pg');

const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');
const backendEnvPath = path.resolve(__dirname, '..', '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: false });
}

const DEMO_EMAIL_DOMAIN = 'demo.com';
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || 'DemoPassword123!';

const ADMIN_COUNT = 3;
const HOST_COUNT = 80;
const GUEST_COUNT = 380;
const HOST_REQUEST_PENDING_COUNT = 8;
const HOST_REQUEST_REJECTED_COUNT = 6;
const HOST_REQUEST_COUNT = HOST_REQUEST_PENDING_COUNT + HOST_REQUEST_REJECTED_COUNT;
const MEAL_COUNT = 520;
const REPORT_COUNT = 16;

const HOUSE_PHOTO_COUNT = 100;

const femaleProfiles = [
  ['Nadia', 'Boucher'],
  ['Camille', 'Martin'],
  ['Emma', 'Dubois'],
  ['Léa', 'Bernard'],
  ['Manon', 'Petit'],
  ['Chloé', 'Robert'],
  ['Inès', 'Laurent'],
  ['Sarah', 'Moreau'],
  ['Louise', 'Simon'],
  ['Alice', 'Lefèvre'],
  ['Clara', 'Roux'],
  ['Zoé', 'Garnier'],
  ['Nina', 'Perrin'],
  ['Sofia', 'Lopez'],
  ['Maya', 'Mercier'],
  ['Lola', 'Briand'],
  ['Anaïs', 'Chevalier'],
  ['Élise', 'Fontaine'],
  ['Jeanne', 'Morel'],
  ['Amélie', 'Girard'],
  ['Julie', 'Lefebvre'],
  ['Marion', 'Muller'],
  ['Aïcha', 'Benali'],
  ['Fatima', 'Haddad'],
  ['Lina', 'Nguyen'],
  ['Eva', 'Garcia'],
  ['Lucie', 'Lambert'],
  ['Océane', 'Le Goff'],
  ['Maëlle', 'Leclerc'],
  ['Salomé', 'Brun'],
];

const maleProfiles = [
  ['Lucas', 'Martin'],
  ['Hugo', 'Bernard'],
  ['Noah', 'Petit'],
  ['Louis', 'Robert'],
  ['Nathan', 'Dubois'],
  ['Gabriel', 'Moreau'],
  ['Arthur', 'Laurent'],
  ['Jules', 'Simon'],
  ['Raphaël', 'Michel'],
  ['Adam', 'Roux'],
  ['Maël', 'Leroy'],
  ['Yanis', 'Fournier'],
  ['Tom', 'Girard'],
  ['Victor', 'Bonnet'],
  ['Baptiste', 'Dupont'],
  ['Mehdi', 'Benali'],
  ['Antoine', 'Garnier'],
  ['Paul', 'Mercier'],
  ['Théo', 'Lopez'],
  ['Romain', 'Briand'],
  ['Karim', 'Haddad'],
  ['Samuel', 'Fontaine'],
  ['Maxime', 'Lefevre'],
  ['Nicolas', 'Muller'],
  ['Julien', 'Morel'],
  ['Enzo', 'Garcia'],
  ['Thomas', 'Lambert'],
  ['Alexandre', 'Le Goff'],
  ['Mathis', 'Leclerc'],
  ['Ibrahim', 'Nguyen'],
];

const femaleAvatarFiles = [
  '001.jpg',
  '003.jpg',
  '005.jpg',
  '007.jpg',
  '009.jpg',
  '011.jpg',
  '013.jpg',
  '015.jpg',
  '017.jpg',
  '019.jpg',
  '021.jpg',
  '023.jpg',
  '025.jpg',
  '027.jpg',
  '029.jpg',
  '031.jpg',
  '034.jpg',
  '035.jpg',
  '036.jpg',
  '038.jpg',
  '039.jpg',
  '041.jpg',
  '042.jpg',
  '044.jpg',
  '046.jpg',
  '049.jpg',
  '052.jpg',
  '054.jpg',
  '055.jpg',
  '056.jpg',
  '057.jpg',
  '058.jpg',
  '059.jpg',
  '068.jpg',
  '069.jpg',
  '070.jpg',
  '075.jpg',
  '076.jpg',
  '078.jpg',
  '080.jpg',
  '081.jpg',
  '083.jpg',
  '085.jpg',
  '088.jpg',
  '093.jpg',
  '094.jpg',
  '096.jpg',
  '098.jpg',
];

const maleAvatarFiles = [
  '002.jpg',
  '004.jpg',
  '006.jpg',
  '008.jpg',
  '010.jpg',
  '012.jpg',
  '014.jpg',
  '016.jpg',
  '018.jpg',
  '020.jpg',
  '022.jpg',
  '024.jpg',
  '026.jpg',
  '028.jpg',
  '030.jpg',
  '032.jpg',
  '033.jpg',
  '037.jpg',
  '040.jpg',
  '043.jpg',
  '045.jpg',
  '047.jpg',
  '048.jpg',
  '050.jpg',
  '051.jpg',
  '053.jpg',
  '060.jpg',
  '061.jpg',
  '062.jpg',
  '063.jpg',
  '064.jpg',
  '065.jpg',
  '066.jpg',
  '067.jpg',
  '071.jpg',
  '072.jpg',
  '073.jpg',
  '074.jpg',
  '077.jpg',
  '079.jpg',
  '082.jpg',
  '084.jpg',
  '086.jpg',
  '087.jpg',
  '089.jpg',
  '090.jpg',
  '091.jpg',
  '092.jpg',
  '095.jpg',
  '097.jpg',
  '099.jpg',
  '100.jpg',
];

const cities = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522, weight: 42, districts: ['Canal Saint-Martin', 'Montmartre', 'Belleville', 'Bastille', 'Invalides'] },
  { name: 'Lyon', lat: 45.764, lng: 4.8357, weight: 28, districts: ['Croix-Rousse', 'Vieux Lyon', 'Guillotière', 'Monplaisir', 'Part-Dieu'] },
  { name: 'Marseille', lat: 43.2965, lng: 5.3698, weight: 24, districts: ['Le Panier', 'Castellane', 'Prado', 'La Joliette', 'Endoume'] },
  { name: 'Toulouse', lat: 43.6047, lng: 1.4442, weight: 22, districts: ['Capitole', 'Saint-Cyprien', 'Carmes', 'Compans', 'Minimes'] },
  { name: 'Bordeaux', lat: 44.8378, lng: -0.5792, weight: 20, districts: ['Saint-Pierre', 'Chartrons', 'Saint-Michel', 'Bastide', 'Caudéran'] },
  { name: 'Nantes', lat: 47.2184, lng: -1.5536, weight: 20, districts: ['Graslin', 'Île de Nantes', 'Talensac', 'Procé', 'Bouffay'] },
  { name: 'Lille', lat: 50.6292, lng: 3.0573, weight: 18, districts: ['Vieux-Lille', 'Wazemmes', 'Vauban', 'Fives', 'Moulins'] },
  { name: 'Rennes', lat: 48.1173, lng: -1.6778, weight: 18, districts: ['Centre', 'Thabor', 'Villejean', 'Sainte-Thérèse', 'Beaulieu'] },
  { name: 'Strasbourg', lat: 48.5734, lng: 7.7521, weight: 16, districts: ['Petite France', 'Neudorf', 'Krutenau', 'Orangerie', 'Esplanade'] },
  { name: 'Montpellier', lat: 43.6108, lng: 3.8767, weight: 16, districts: ['Écusson', 'Antigone', 'Beaux-Arts', 'Port Marianne', 'Boutonnet'] },
  { name: 'Nice', lat: 43.7102, lng: 7.262, weight: 16, districts: ['Libération', 'Vieux-Nice', 'Cimiez', 'Riquier', 'Port'] },
  { name: 'Grenoble', lat: 45.1885, lng: 5.7245, weight: 12, districts: ['Championnet', 'Île Verte', 'Europole', 'Berriat', 'Notre-Dame'] },
  { name: 'Angers', lat: 47.4784, lng: -0.5632, weight: 10, districts: ['Centre', 'Doutre', 'Lafayette', 'Justices', 'Belle-Beille'] },
  { name: 'Brest', lat: 48.3904, lng: -4.4861, weight: 9, districts: ['Saint-Martin', 'Siam', 'Recouvrance', 'Lambézellec', 'Port'] },
  { name: 'Dijon', lat: 47.322, lng: 5.0415, weight: 9, districts: ['Centre', 'Montchapet', 'Toison d’Or', 'Port du Canal', 'Jouvence'] },
  { name: 'Tours', lat: 47.3941, lng: 0.6848, weight: 9, districts: ['Vieux Tours', 'Prébandes', 'Sanitas', 'Febvotte', 'Cathédrale'] },
  { name: 'Reims', lat: 49.2583, lng: 4.0317, weight: 9, districts: ['Centre', 'Boulingrin', 'Clairmarais', 'Cernay', 'Saint-Remi'] },
  { name: 'Rouen', lat: 49.4431, lng: 1.0993, weight: 8, districts: ['Centre', 'Saint-Marc', 'Gare', 'Jouvenet', 'Grammont'] },
  { name: 'Caen', lat: 49.1829, lng: -0.3707, weight: 8, districts: ['Vaugueux', 'Port', 'Saint-Jean', 'Beaulieu', 'Folie-Couvrechef'] },
  { name: 'Nancy', lat: 48.6921, lng: 6.1844, weight: 8, districts: ['Vieille Ville', 'Saurupt', 'Mon Désert', 'Rives de Meurthe', 'Pépinière'] },
  { name: 'Metz', lat: 49.1193, lng: 6.1757, weight: 8, districts: ['Centre', 'Sablon', 'Queuleu', 'Nouvelle Ville', 'Outre-Seille'] },
  { name: 'Clermont-Ferrand', lat: 45.7772, lng: 3.087, weight: 8, districts: ['Centre', 'Montferrand', 'Jaude', 'Chamalières', 'Oradou'] },
  { name: 'Orléans', lat: 47.9029, lng: 1.9093, weight: 8, districts: ['Centre', 'Dunois', 'Bourgogne', 'Madeleine', 'Saint-Marceau'] },
  { name: 'La Rochelle', lat: 46.1603, lng: -1.1511, weight: 7, districts: ['Vieux Port', 'Minimes', 'La Genette', 'Tasdon', 'Laleu'] },
  { name: 'Annecy', lat: 45.8992, lng: 6.1294, weight: 7, districts: ['Vieille Ville', 'Novel', 'Albigny', 'Seynod', 'Cran'] },
  { name: 'Avignon', lat: 43.9493, lng: 4.8055, weight: 7, districts: ['Intra-muros', 'Monclar', 'Saint-Ruf', 'Rocade', 'Barthelasse'] },
  { name: 'Pau', lat: 43.2951, lng: -0.3708, weight: 6, districts: ['Centre', 'Trespoey', 'Hédas', 'Université', 'Billère'] },
  { name: 'Nîmes', lat: 43.8367, lng: 4.3601, weight: 6, districts: ['Écusson', 'Jean-Jaurès', 'Gambetta', 'Route d’Arles', 'Castanet'] },
  { name: 'Perpignan', lat: 42.6887, lng: 2.8948, weight: 6, districts: ['Centre', 'Saint-Jacques', 'Moulin à Vent', 'Bas-Vernet', 'Gare'] },
  { name: 'Besançon', lat: 47.2378, lng: 6.0241, weight: 6, districts: ['Boucle', 'Battant', 'Chaprais', 'Planoise', 'Butte'] },
  { name: 'Le Mans', lat: 48.0061, lng: 0.1996, weight: 6, districts: ['Cité Plantagenêt', 'République', 'Gare', 'Pontlieue', 'Sablons'] },
  { name: 'Amiens', lat: 49.8941, lng: 2.2958, weight: 6, districts: ['Saint-Leu', 'Henriville', 'Centre', 'Gare', 'Saint-Pierre'] },
  { name: 'Poitiers', lat: 46.5802, lng: 0.3404, weight: 5, districts: ['Plateau', 'Pont-Neuf', 'Gibauderie', 'Montbernage', 'Blossac'] },
  { name: 'Bayonne', lat: 43.4929, lng: -1.4748, weight: 5, districts: ['Grand Bayonne', 'Petit Bayonne', 'Saint-Esprit', 'Marracq', 'Arènes'] },
  { name: 'Vannes', lat: 47.6582, lng: -2.7608, weight: 5, districts: ['Centre', 'Port', 'Conleau', 'Ménimur', 'Tohannic'] },
  { name: 'Saint-Malo', lat: 48.6493, lng: -2.0257, weight: 4, districts: ['Intra-Muros', 'Paramé', 'Saint-Servan', 'Rocabey', 'Rothéneuf'] },
  { name: 'Colmar', lat: 48.0794, lng: 7.3585, weight: 4, districts: ['Centre', 'Petite Venise', 'Saint-Joseph', 'Ladhof', 'Maraîchers'] },
  { name: 'Troyes', lat: 48.2973, lng: 4.0744, weight: 4, districts: ['Bouchon', 'Chartreux', 'Vassaules', 'Gare', 'Bas-Trévois'] },
  { name: 'Chambéry', lat: 45.5646, lng: 5.9178, weight: 4, districts: ['Centre', 'Bissy', 'Chambéry-le-Vieux', 'Laurier', 'Biollay'] },
  { name: 'Valence', lat: 44.9334, lng: 4.8924, weight: 4, districts: ['Centre', 'Châteauvert', 'Fontbarlettes', 'Briffaut', 'Valensolles'] },
  { name: 'Chartres', lat: 48.4439, lng: 1.489, weight: 3, districts: ['Centre', 'La Madeleine', 'Rechèvres', 'Beaulieu', 'Gare'] },
  { name: 'Quimper', lat: 47.9975, lng: -4.0979, weight: 3, districts: ['Centre', 'Locmaria', 'Kerfeunteun', 'Ergué-Armel', 'Moulin Vert'] },
  { name: 'Arras', lat: 50.291, lng: 2.7775, weight: 3, districts: ['Grand-Place', 'Méaulens', 'Saint-Sauveur', 'Baudimont', 'Citadelle'] },
];

const priorityHostCityNames = [
  ...Array(18).fill('Paris'),
  ...Array(7).fill('Lyon'),
  ...Array(6).fill('Marseille'),
  ...Array(5).fill('Toulouse'),
  ...Array(5).fill('Bordeaux'),
  ...Array(5).fill('Nantes'),
  ...Array(4).fill('Lille'),
  ...Array(4).fill('Rennes'),
  ...Array(3).fill('Strasbourg'),
  ...Array(3).fill('Montpellier'),
  ...Array(3).fill('Nice'),
];

const streets = [
  'rue de la République',
  'rue Victor Hugo',
  'avenue Jean Jaurès',
  'rue des Lilas',
  'rue du Marché',
  'boulevard Pasteur',
  'rue Saint-Michel',
  'rue des Jardins',
  'avenue de la Gare',
  'rue du Port',
  'rue des Écoles',
  'cours Gambetta',
  'rue Nationale',
  'allée des Tilleuls',
  'place du Centre',
];

const defaultDrinks = [
  'Eau pétillante',
  'Citronnade maison',
  'Infusion froide',
  'Thé glacé',
];

const mealTemplates = [
  {
    title: 'Bœuf bourguignon maison',
    titleVariants: ['Bœuf bourguignon maison', 'Bœuf bourguignon mijoté', 'Bœuf bourguignon du dimanche'],
    type: 'Diner',
    main: 'Bœuf bourguignon aux carottes et champignons',
    photoFile: 'boeuf bourguignon.webp',
    starters: ['Œufs mimosa', 'Salade de mâche', 'Velouté de légumes'],
    desserts: ['Poire pochée', 'Mousse au chocolat', 'Tarte fine aux pommes'],
    tags: ['discussions-enrichissantes', 'convivial-et-festif'],
  },
  {
    title: 'Couscous convivial',
    titleVariants: ['Couscous convivial', 'Couscous légumes et semoule', 'Couscous maison du vendredi'],
    type: 'Diner',
    main: 'Couscous aux légumes, pois chiches et semoule',
    photoFile: 'couscous.webp',
    starters: ['Carottes au cumin', 'Salade de concombre', 'Brick aux légumes'],
    desserts: ['Orange à la cannelle', 'Makrout', 'Salade de fruits'],
    tags: ['halal', 'repas-en-plein-air', 'cuisine-du-monde', 'convivial-et-festif'],
  },
  {
    title: 'Croque-monsieur entre voisins',
    titleVariants: ['Croque-monsieur entre voisins', 'Croque-monsieur gratiné', 'Déjeuner croque et salade'],
    type: 'Déjeuner',
    main: 'Croque-monsieur gratiné et salade verte',
    photoFile: 'croque monsieur.webp',
    starters: ['Crudités croquantes', 'Soupe froide', 'Petite salade verte'],
    desserts: ['Fromage blanc au miel', 'Compote maison', 'Cookie chocolat'],
    tags: ['ambiance-decontractee', 'repas-calme'],
  },
  {
    title: 'Crêpes sucrées-salées',
    titleVariants: ['Crêpes sucrées-salées', 'Goûter crêpes maison', 'Crêpes au caramel beurre salé'],
    type: 'Goûter',
    main: 'Crêpes maison avec garnitures sucrées et salées',
    photoFile: 'crêpes.webp',
    starters: ['Assiette de fruits', 'Noix et raisins secs', 'Petite salade'],
    desserts: ['Crêpe chocolat', 'Crêpe confiture', 'Crêpe caramel'],
    tags: ['vegetarien', 'repas-en-plein-air', 'ambiance-decontractee'],
  },
  {
    title: 'Gratin familial',
    titleVariants: ['Gratin familial', 'Gratin de légumes du marché', 'Gratin fondant à partager'],
    type: 'Diner',
    main: 'Gratin de saison aux légumes rôtis',
    photoFile: 'gratin.webp',
    starters: ['Velouté de courge', 'Salade de lentilles', 'Tartinade aux herbes'],
    desserts: ['Clafoutis', 'Yaourt fermier', 'Panna cotta'],
    tags: ['vegetarien', 'ambiance-decontractee'],
  },
  {
    title: 'Lasagnes du dimanche',
    titleVariants: ['Lasagnes du dimanche', 'Lasagnes maison gratinées', 'Lasagnes à partager'],
    type: 'Diner',
    main: 'Lasagnes maison à la sauce tomate',
    photoFile: 'lasagne.webp',
    starters: ['Bruschetta tomate', 'Salade roquette', 'Antipasti de légumes'],
    desserts: ['Tiramisu léger', 'Panna cotta', 'Salade d’agrumes'],
    tags: ['vegetarien', 'convivial-et-festif', 'cuisine-du-monde'],
  },
  {
    title: 'Pâtes carbonara',
    titleVariants: ['Pâtes carbonara', 'Carbonara généreuse', 'Soirée pâtes carbonara'],
    type: 'Diner',
    main: 'Pâtes carbonara crémeuses',
    photoFile: 'pate carbonara.webp',
    starters: ['Salade verte', 'Tomates basilic', 'Velouté parmesan'],
    desserts: ['Crème dessert', 'Tartelette citron', 'Fruit de saison'],
    tags: ['ambiance-decontractee', 'convivial-et-festif'],
  },
  {
    title: 'Pâtes au pesto',
    titleVariants: ['Pâtes au pesto', 'Pâtes pesto basilic', 'Déjeuner pesto maison'],
    type: 'Déjeuner',
    main: 'Pâtes au pesto de basilic et parmesan',
    photoFile: 'pates pesto.webp',
    starters: ['Mozzarella tomate', 'Salade de roquette', 'Courgettes marinées'],
    desserts: ['Pêche rôtie', 'Panna cotta', 'Sorbet citron'],
    tags: ['vegetarien', 'repas-calme'],
  },
  {
    title: 'Pizza partagée',
    titleVariants: ['Pizza partagée', 'Pizza maison à partager', 'Soirée pizza entre voisins'],
    type: 'Diner',
    main: 'Pizza maison tomate, mozzarella et légumes',
    photoFile: 'pizza.webp',
    starters: ['Olives marinées', 'Focaccia', 'Salade italienne'],
    desserts: ['Tiramisu', 'Glace vanille', 'Fraises au sucre'],
    tags: ['vegetarien', 'repas-en-plein-air', 'soiree-jeux', 'convivial-et-festif'],
  },
  {
    title: 'Pot-au-feu traditionnel',
    titleVariants: ['Pot-au-feu traditionnel', 'Pot-au-feu familial', 'Pot-au-feu du marché'],
    type: 'Diner',
    main: 'Pot-au-feu aux légumes anciens',
    photoFile: 'pot au feu.webp',
    starters: ['Bouillon parfumé', 'Poireaux vinaigrette', 'Betteraves rôties'],
    desserts: ['Riz au lait', 'Compote pomme-poire', 'Tarte normande'],
    tags: ['discussions-enrichissantes', 'repas-calme'],
  },
  {
    title: 'Poulet rôti du marché',
    titleVariants: ['Poulet rôti du marché', 'Poulet rôti aux herbes', 'Déjeuner poulet rôti'],
    type: 'Déjeuner',
    main: 'Poulet rôti aux herbes et pommes de terre',
    photoFile: 'poulet roti.webp',
    starters: ['Carottes râpées', 'Salade de tomates', 'Houmous citronné'],
    desserts: ['Gâteau au yaourt', 'Abricots rôtis', 'Mousse au chocolat'],
    tags: ['repas-en-plein-air', 'ambiance-decontractee'],
  },
  {
    title: 'Quiche lorraine',
    titleVariants: ['Quiche lorraine', 'Brunch quiche lorraine', 'Quiche maison et salade'],
    type: 'Brunch',
    main: 'Quiche lorraine accompagnée d’une salade',
    photoFile: 'quiche lorraine.webp',
    starters: ['Radis beurre', 'Salade de jeunes pousses', 'Velouté froid'],
    desserts: ['Cake citron', 'Fromage blanc', 'Compote cannelle'],
    tags: ['repas-en-plein-air', 'ambiance-decontractee', 'flexitarien'],
  },
  {
    title: 'Riz cantonais',
    titleVariants: ['Riz cantonais', 'Riz cantonais maison', 'Dîner riz cantonais'],
    type: 'Diner',
    main: 'Riz cantonais aux légumes et œufs',
    photoFile: 'riz cantonnais.webp',
    starters: ['Rouleaux de printemps', 'Concombre sésame', 'Soupe miso'],
    desserts: ['Mangue fraîche', 'Perles coco', 'Litchis'],
    tags: ['vegetarien', 'cuisine-du-monde', 'decouverte-culinaire'],
  },
  {
    title: 'Salade César',
    titleVariants: ['Salade César', 'Déjeuner salade César', 'Salade César maison'],
    type: 'Déjeuner',
    main: 'Salade César au poulet, parmesan et croûtons',
    photoFile: 'salade césar.webp',
    starters: ['Gaspacho', 'Crudités', 'Tartines grillées'],
    desserts: ['Salade de fruits', 'Yaourt grec', 'Cookie avoine'],
    tags: ['repas-en-plein-air', 'flexitarien', 'repas-calme'],
  },
  {
    title: 'Spaghetti bolognaise',
    titleVariants: ['Spaghetti bolognaise', 'Spaghetti bolo maison', 'Dîner spaghetti bolognaise'],
    type: 'Diner',
    main: 'Spaghetti bolognaise mijotés',
    photoFile: 'spaghetti bolognaise.webp',
    starters: ['Salade italienne', 'Bruschetta', 'Courgettes marinées'],
    desserts: ['Tiramisu', 'Panna cotta', 'Poire au chocolat'],
    tags: ['convivial-et-festif', 'ambiance-decontractee'],
  },
  {
    title: 'Sushis maison',
    titleVariants: ['Sushis maison', 'Soirée sushis', 'Sushis et makis à partager'],
    type: 'Diner',
    main: 'Sushis, makis et légumes marinés',
    photoFile: 'sushi.webp',
    starters: ['Soupe miso', 'Edamame', 'Salade wakamé'],
    desserts: ['Mochis glacés', 'Mangue fraîche', 'Perles coco'],
    tags: ['cuisine-du-monde', 'decouverte-culinaire'],
  },
  {
    title: 'Tarte aux pommes',
    titleVariants: ['Tarte aux pommes', 'Goûter tarte aux pommes', 'Tarte aux pommes maison'],
    type: 'Goûter',
    main: 'Tarte aux pommes maison',
    photoFile: 'tarte aux pommes.webp',
    starters: ['Fruits secs', 'Petites madeleines', 'Assiette de fruits'],
    desserts: ['Tarte aux pommes', 'Crème fouettée', 'Glace vanille'],
    tags: ['vegetarien', 'ambiance-decontractee'],
  },
];

const mealTags = [
  ['arriver_a_l_heure', "Merci d'arriver à l'heure", 'house_rule', 10],
  ['prevenir_allergie', "Préviens-moi en cas d'allergie", 'house_rule', 20],
  ['non_fumeur', 'Non-fumeur', 'house_rule', 30],
  ['pas_d_alcool', "Pas d'alcool", 'house_rule', 40],
  ['pas_d_animaux', "Pas d'animaux", 'house_rule', 50],
  ['retirer_ses_chaussures', 'Retirer ses chaussures', 'house_rule', 60],
  ['ambiance_calme', 'Ambiance calme', 'house_rule', 70],
  ['accessible_pmr', 'Accessible PMR', 'house_rule', 80],
  ['vegetarien', 'Végétarien', 'dietary_preference', 10],
  ['vegan', 'Vegan', 'dietary_preference', 20],
  ['flexitarien', 'Flexitarien', 'dietary_preference', 30],
  ['sans-gluten', 'Sans gluten', 'dietary_preference', 40],
  ['sans-lactose', 'Sans lactose', 'dietary_preference', 50],
  ['halal', 'Halal', 'dietary_preference', 60],
  ['casher', 'Casher', 'dietary_preference', 70],
  ['allergie-aux-noix', 'Allergie aux noix', 'dietary_preference', 80],
  ['diabetique', 'Diabétique', 'dietary_preference', 90],
  ['pas-de-porc', 'Pas de porc', 'dietary_preference', 100],
  ['discussions-enrichissantes', 'Discussions enrichissantes', 'meal_ambiance', 10],
  ['ambiance-decontractee', 'Ambiance décontractée', 'meal_ambiance', 20],
  ['soiree-jeux', 'Soirée jeux', 'meal_ambiance', 30],
  ['decouverte-culinaire', 'Découverte culinaire', 'meal_ambiance', 40],
  ['repas-calme', 'Repas calme', 'meal_ambiance', 50],
  ['echange-linguistique', 'Échange linguistique', 'meal_ambiance', 60],
  ['cuisine-du-monde', 'Cuisine du monde', 'meal_ambiance', 70],
  ['repas-en-plein-air', 'Repas en plein air', 'meal_ambiance', 80],
  ['convivial-et-festif', 'Convivial et festif', 'meal_ambiance', 90],
  ['sans-ecrans', 'Sans écrans', 'meal_ambiance', 100],
];

const preferenceTags = [
  ['vegetarien', 'Végétarien', 'dietary'],
  ['vegan', 'Vegan', 'dietary'],
  ['flexitarien', 'Flexitarien', 'dietary'],
  ['sans-gluten', 'Sans gluten', 'dietary'],
  ['sans-lactose', 'Sans lactose', 'dietary'],
  ['halal', 'Halal', 'dietary'],
  ['pas-de-porc', 'Pas de porc', 'dietary'],
  ['discussions-enrichissantes', 'Discussions enrichissantes', 'meal_ambiance'],
  ['ambiance-decontractee', 'Ambiance décontractée', 'meal_ambiance'],
  ['soiree-jeux', 'Soirée jeux', 'meal_ambiance'],
  ['decouverte-culinaire', 'Découverte culinaire', 'meal_ambiance'],
  ['repas-calme', 'Repas calme', 'meal_ambiance'],
  ['cuisine-du-monde', 'Cuisine du monde', 'meal_ambiance'],
];

const directMessages = [
  "Bonjour, je viens de faire une demande de réservation.",
  "Avec plaisir, merci pour ta demande.",
  "Est-ce qu'il faut prévoir quelque chose ?",
  "Rien de particulier, viens comme tu es.",
  "Super, j'ai hâte de découvrir la table.",
  "Je t'enverrai les dernières infos avant le repas.",
  "Merci beaucoup, à très vite.",
  "À très vite !",
];

const groupMessages = [
  'Bonjour tout le monde !',
  'Trop hâte de partager ce repas avec vous.',
  "Je peux apporter une boisson sans alcool.",
  "Merci, c'est parfait.",
  "L'adresse exacte sera visible pour les participants.",
  "Je serai là quelques minutes en avance.",
  'Le menu a l’air super.',
  'À bientôt autour de la table !',
  'Je confirme ma présence.',
  'Belle soirée à tous.',
];

const reviewComments = [
  'Très bon moment, hôte accueillant et repas délicieux.',
  'Ambiance simple et chaleureuse, je recommande.',
  'Repas très bien organisé, échanges intéressants.',
  'Une belle découverte culinaire.',
  'Tout était clair, convivial et agréable.',
  'Très bonne expérience, je reviendrai volontiers.',
  'Menu généreux et discussion très sympa.',
  'Hôte attentionné, logement propre et accueillant.',
];

const hostRequestRejectionReasons = [
  "Les photos du logement ne permettent pas de vérifier correctement l'espace d'accueil.",
  "L'adresse indiquée est incomplète ou ne correspond pas au quartier renseigné.",
  "La candidature manque d'informations pour confirmer les conditions d'accueil.",
  "Les photos doivent montrer au moins l'espace repas et la cuisine.",
  "La demande doit être complétée avec une adresse vérifiable.",
  "Le logement présenté ne permet pas encore de valider l'accueil de participants.",
];

function createRandom(seed) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const random = createRandom(20260613);

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[Math.floor(random() * items.length)];
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function pickPriorityHostCity(index) {
  const cityName = priorityHostCityNames[index - 1];

  if (!cityName) {
    return weightedPick(cities);
  }

  return cities.find((city) => city.name === cityName) ?? weightedPick(cities);
}

function pad(value, size = 3) {
  return String(value).padStart(size, '0');
}

function addDays(date, days, hour = 19, minute = 30) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function makeShowcaseMealDate(now, timing, index, hour) {
  if (timing === 'today') {
    const date = new Date(now);
    date.setHours(Math.max(now.getHours() + 2, hour), index % 2 === 0 ? 0 : 30, 0, 0);
    return date;
  }

  if (timing === 'past') {
    return addDays(now, -8 - index, hour, index % 2 === 0 ? 0 : 30);
  }

  return addDays(now, 5 + index, hour, index % 2 === 0 ? 0 : 30);
}

function offsetCoordinate(city, distanceKm = 8) {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * distanceKm;
  const latOffset = (radius / 111) * Math.cos(angle);
  const lngOffset = (radius / (111 * Math.cos((city.lat * Math.PI) / 180))) * Math.sin(angle);
  return {
    lat: Number((city.lat + latOffset).toFixed(6)),
    lng: Number((city.lng + lngOffset).toFixed(6)),
  };
}

function makeAddress(city, index) {
  return `${(index % 96) + 2} ${pick(streets)}, ${city.name}`;
}

function makeHomePhotos(index) {
  const homeIndex = ((index - 1) % HOUSE_PHOTO_COUNT) + 1;
  const photos = [
    `/assets/home/${homeIndex}_frontal.jpg`,
    `/assets/home/${homeIndex}_kitchen.jpg`,
  ];

  if (index % 3 === 0) {
    const nextHomeIndex = (homeIndex % HOUSE_PHOTO_COUNT) + 1;
    photos.push(`/assets/home/${nextHomeIndex}_frontal.jpg`);
  }

  if (index % 5 === 0) {
    const nextHomeIndex = ((homeIndex + 1) % HOUSE_PHOTO_COUNT) + 1;
    photos.push(`/assets/home/${nextHomeIndex}_kitchen.jpg`);
  }

  return photos;
}

function normalizeSlug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
}

function getDemoEmailPatterns() {
  return [
    `%@${DEMO_EMAIL_DOMAIN}`,
    '%@demo.ramenetapoire.local',
    'rtp.%@%',
  ];
}

function buildLikeWhere(column, values) {
  return values.map((_, index) => `${column} LIKE $${index + 1}`).join(' OR ');
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function deleteAllSeedData(client) {
  const tables = [
    'reports',
    'message_entries',
    'message_conversation_members',
    'message_conversations',
    'meal_reminder_notifications',
    'push_subscriptions',
    'push_notification_preferences',
    'tips',
    'reviews',
    'payments',
    'bookings',
    'meal_tag_assignments',
    'meal_menu_items',
    'meals',
    'host_profile_review_logs',
    'user_preference_tags',
    'preference_tags',
    'host_profiles',
    'newsletter_subscriptions',
    'users',
    'meal_tags',
    'roles',
  ];
  const existingTables = await queryRows(
    client,
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [tables],
  );
  const tableNames = existingTables.map((row) => quoteIdentifier(row.table_name));

  if (tableNames.length === 0) {
    return;
  }

  await client.query(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`);
}

function makePerson(index, preferredGender) {
  const gender = preferredGender || (index % 2 === 0 ? 'male' : 'female');
  const source = gender === 'female' ? femaleProfiles : maleProfiles;
  const firstName = source[(index - 1) % source.length][0];
  const lastName = source[Math.floor((index - 1) / source.length) % source.length][1];
  return {
    firstName,
    lastName,
    gender,
    fullName: `${firstName} ${lastName}`,
  };
}

function makePseudo(person, index) {
  return `${normalizeSlug(person.firstName)}.${normalizeSlug(person.lastName)}.${pad(index)}`.slice(0, 50);
}

function makeEmail(person, index) {
  const base = `${normalizeSlug(person.lastName)}.${normalizeSlug(person.firstName)}`;
  return `${base}@${DEMO_EMAIL_DOMAIN}`.toLowerCase();
}

function makeAvatarUrl(person, index) {
  const isFemale = person.gender === 'female';
  const files = isFemale ? femaleAvatarFiles : maleAvatarFiles;
  const folder = isFemale ? 'Femme' : 'Homme';
  return `/assets/avatars/${folder}/${files[(index - 1) % files.length]}`;
}

function makeMealPhotoUrl(template) {
  return encodeURI(`/assets/meals/${template.photoFile}`);
}

const mealPriceRangesByPhoto = {
  'boeuf.bourguignon': [17, 21],
  couscous: [11, 15],
  'croque.monsieur': [7, 9],
  crepes: [7, 9],
  gratin: [8, 11],
  lasagne: [10, 13],
  'pate.carbonara': [9, 12],
  'pates.pesto': [9, 9],
  pizza: [8, 11],
  'pot.au.feu': [13, 17],
  'poulet.roti': [12, 15],
  'quiche.lorraine': [8, 11],
  'riz.cantonnais': [9, 12],
  'salade.cesar': [8, 11],
  'spaghetti.bolognaise': [10, 13],
  sushi: [16, 22],
  'tarte.aux.pommes': [6, 8],
};

const vegetarianMealPhotoKeys = new Set([
  'crepes',
  'gratin',
  'lasagne',
  'pates.pesto',
  'pizza',
  'riz.cantonnais',
  'tarte.aux.pommes',
]);

const veganMealPhotoKeys = new Set(['couscous']);

const noPorkMealPhotoKeys = new Set([
  'boeuf.bourguignon',
  'couscous',
  'crepes',
  'gratin',
  'lasagne',
  'pates.pesto',
  'pizza',
  'pot.au.feu',
  'poulet.roti',
  'riz.cantonnais',
  'salade.cesar',
  'spaghetti.bolognaise',
  'sushi',
  'tarte.aux.pommes',
]);

const halalMealPhotoKeys = new Set([
  'boeuf.bourguignon',
  'couscous',
  'poulet.roti',
  'riz.cantonnais',
]);

const dietaryTagCompatibility = new Map([
  ['vegetarien', vegetarianMealPhotoKeys],
  ['vegan', veganMealPhotoKeys],
  ['halal', halalMealPhotoKeys],
  ['pas-de-porc', noPorkMealPhotoKeys],
]);

function getMealPhotoKey(template) {
  return normalizeSlug(template.photoFile).replace(/\.webp$/, '');
}

function makeMealPriceCents(template) {
  const photoKey = getMealPhotoKey(template);
  const [min, max] = mealPriceRangesByPhoto[photoKey] ?? [10, 16];
  return randomInt(min, max) * 100;
}

function getCompatibleMealTags(codes, photoKey) {
  return codes.filter((code) => {
    const compatiblePhotoKeys = dietaryTagCompatibility.get(code);
    return !compatiblePhotoKeys || compatiblePhotoKeys.has(photoKey);
  });
}

function makeMealTitle(template, host, index) {
  const variants = template.titleVariants?.length ? template.titleVariants : [template.title];
  const title = variants[(index - 1) % variants.length];
  return index % 5 === 0 ? `${title} à ${host.city}` : title;
}

function makeMealDescription(template) {
  return `${template.main}, entrée maison et dessert de saison. Repas préparé pour une table conviviale.`;
}

function makeBio(role, cityName, firstName) {
  if (role === 'host') {
    return `${firstName} ouvre sa table à ${cityName} pour des repas simples, chaleureux et faits maison.`;
  }
  if (role === 'admin') {
    return 'Compte administrateur de démonstration pour la modération.';
  }
  return `${firstName} aime découvrir des tables locales à ${cityName} et rencontrer de nouvelles personnes.`;
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function ensureRole(client, name) {
  const rows = await queryRows(
    client,
    `
      INSERT INTO roles (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [name],
  );
  return rows[0].id;
}

async function ensureMealTags(client) {
  const tagIds = new Map();
  for (const [code, label, category, sortOrder] of mealTags) {
    const rows = await queryRows(
      client,
      `
        INSERT INTO meal_tags (code, label, category, sort_order, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (code) DO UPDATE
        SET label = EXCLUDED.label,
            category = EXCLUDED.category,
            sort_order = EXCLUDED.sort_order,
            is_active = true
        RETURNING id
      `,
      [code, label, category, sortOrder],
    );
    tagIds.set(code, rows[0].id);
  }
  return tagIds;
}

async function ensurePreferenceTags(client) {
  const tagIds = new Map();
  for (const [slug, label, category] of preferenceTags) {
    const existing = await queryRows(
      client,
      `
        SELECT id
        FROM preference_tags
        WHERE slug = $1
          AND category = $2
          AND owner_user_id IS NULL
        LIMIT 1
      `,
      [slug, category],
    );

    if (existing[0]) {
      await client.query(
        `
          UPDATE preference_tags
          SET label = $2, is_system = true, is_active = true
          WHERE id = $1
        `,
        [existing[0].id, label],
      );
      tagIds.set(slug, existing[0].id);
      continue;
    }

    const rows = await queryRows(
      client,
      `
        INSERT INTO preference_tags (slug, label, category, is_system, is_active, owner_user_id)
        VALUES ($1, $2, $3, true, true, NULL)
        RETURNING id
      `,
      [slug, label, category],
    );
    tagIds.set(slug, rows[0].id);
  }
  return tagIds;
}

async function deleteDemoData(client) {
  const demoEmailPatterns = getDemoEmailPatterns();
  const demoEmailWhere = buildLikeWhere('email', demoEmailPatterns);
  const users = await queryRows(
    client,
    `SELECT id FROM users WHERE ${demoEmailWhere}`,
    demoEmailPatterns,
  );
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    return;
  }

  const hostProfiles = await queryRows(
    client,
    'SELECT id FROM host_profiles WHERE user_id = ANY($1::int[])',
    [userIds],
  );
  const hostProfileIds = hostProfiles.map((profile) => profile.id);

  const meals = await queryRows(
    client,
    'SELECT id FROM meals WHERE host_id = ANY($1::int[])',
    [userIds],
  );
  const mealIds = meals.map((meal) => meal.id);

  const bookings = await queryRows(
    client,
    `
      SELECT id
      FROM bookings
      WHERE guest_user_id = ANY($1::int[])
         OR meal_id = ANY($2::int[])
    `,
    [userIds, mealIds],
  );
  const bookingIds = bookings.map((booking) => booking.id);

  const conversations = await queryRows(
    client,
    `
      SELECT DISTINCT id
      FROM message_conversations
      WHERE meal_id = ANY($1::int[])
      UNION
      SELECT DISTINCT conversation_id AS id
      FROM message_conversation_members
      WHERE user_id = ANY($2::int[])
    `,
    [mealIds, userIds],
  );
  const conversationIds = conversations.map((conversation) => conversation.id);

  await client.query(
    `
      DELETE FROM reports
      WHERE reporter_user_id = ANY($1::int[])
         OR reviewed_by_user_id = ANY($1::int[])
         OR reported_user_id = ANY($1::int[])
         OR reported_meal_id = ANY($2::int[])
         OR reported_booking_id = ANY($3::int[])
         OR reported_conversation_id = ANY($4::int[])
    `,
    [userIds, mealIds, bookingIds, conversationIds],
  );
  await client.query('DELETE FROM tips WHERE booking_id = ANY($1::int[])', [bookingIds]);
  await client.query('DELETE FROM reviews WHERE booking_id = ANY($1::int[])', [bookingIds]);
  await client.query('DELETE FROM payments WHERE booking_id = ANY($1::int[])', [bookingIds]);
  await client.query(
    'DELETE FROM meal_reminder_notifications WHERE user_id = ANY($1::int[]) OR meal_id = ANY($2::int[])',
    [userIds, mealIds],
  );
  await client.query('DELETE FROM message_entries WHERE conversation_id = ANY($1::int[]) OR sender_user_id = ANY($2::int[])', [
    conversationIds,
    userIds,
  ]);
  await client.query('DELETE FROM message_conversation_members WHERE conversation_id = ANY($1::int[]) OR user_id = ANY($2::int[])', [
    conversationIds,
    userIds,
  ]);
  await client.query('DELETE FROM message_conversations WHERE id = ANY($1::int[])', [conversationIds]);
  await client.query('DELETE FROM meal_tag_assignments WHERE meal_id = ANY($1::int[])', [mealIds]);
  await client.query('DELETE FROM meal_menu_items WHERE meal_id = ANY($1::int[])', [mealIds]);
  await client.query('DELETE FROM bookings WHERE id = ANY($1::int[])', [bookingIds]);
  await client.query('DELETE FROM meals WHERE id = ANY($1::int[])', [mealIds]);
  await client.query('DELETE FROM host_profile_review_logs WHERE host_profile_id = ANY($1::int[]) OR admin_user_id = ANY($2::int[])', [
    hostProfileIds,
    userIds,
  ]);
  await client.query('DELETE FROM push_subscriptions WHERE user_id = ANY($1::int[])', [userIds]);
  await client.query('DELETE FROM push_notification_preferences WHERE user_id = ANY($1::int[])', [userIds]);
  await client.query('DELETE FROM user_preference_tags WHERE user_id = ANY($1::int[])', [userIds]);
  await client.query('DELETE FROM preference_tags WHERE owner_user_id = ANY($1::int[])', [userIds]);
  await client.query('DELETE FROM host_profiles WHERE user_id = ANY($1::int[])', [userIds]);
  await client.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds]);
}

async function assertDemoCanRun(client) {
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Seed démo bloquée. Définis ALLOW_DEMO_SEED=true pour autoriser son exécution.',
    );
  }

  const demoEmailPatterns = getDemoEmailPatterns();
  const demoEmailWhere = buildLikeWhere('email', demoEmailPatterns);
  const existing = await queryRows(
    client,
    `SELECT COUNT(*)::int AS count FROM users WHERE ${demoEmailWhere}`,
    demoEmailPatterns,
  );

  if (existing[0].count > 0 && process.env.DEMO_SEED_RESET !== 'true') {
    throw new Error(
      `Des comptes démo existent déjà (${existing[0].count}). Définis DEMO_SEED_RESET=true pour les remplacer.`,
    );
  }
}

async function insertUser(client, data) {
  const rows = await queryRows(
    client,
    `
      INSERT INTO users (
        pseudo,
        email,
        phone,
        password_hash,
        first_name,
        last_name,
        profile_photo_url,
        city,
        country,
        bio,
        birth_date,
        email_verified_at,
        auth_provider,
        is_profile_complete,
        account_status,
        role_id
      )
      VALUES (
        $1, $2, NULL, $3, $4, $5, $6, $7, 'France', $8, $9,
        NOW(), 'local', true, 'active', $10
      )
      RETURNING id
    `,
    [
      data.pseudo,
      data.email,
      data.passwordHash,
      data.firstName,
      data.lastName,
      data.avatarUrl,
      data.city,
      data.bio,
      data.birthDate,
      data.roleId,
    ],
  );
  return rows[0].id;
}

async function insertHostProfile(client, data) {
  const validationStatus = data.validationStatus || 'approved';
  const isApproved = validationStatus === 'approved';
  const addressVerified = data.addressVerified ?? true;
  const homePhotoVerified = data.homePhotoVerified ?? isApproved;
  const verificationScore = data.verificationScore ?? (isApproved ? 92 : 72);
  const autoReviewNotes =
    data.autoReviewNotes ||
    (isApproved
      ? 'Profil démo validé automatiquement pour la présentation.'
      : 'Profil démo en attente de vérification admin.');
  const verificationRiskFlags = data.verificationRiskFlags || [];
  const reviewedAt = data.lastAutoReviewedAt || data.activatedAt || new Date();

  const rows = await queryRows(
    client,
    `
      INSERT INTO host_profiles (
        is_active,
        home_photo_url,
        home_photo_urls,
        validation_status,
        host_level,
        activated_at,
        lat,
        lng,
        country,
        city,
        district_label,
        address,
        address_verified,
        home_photo_verified,
        verification_score,
        auto_review_notes,
        rejection_reason,
        last_auto_reviewed_at,
        home_photo_vision_labels,
        home_photo_safe_search,
        verification_risk_flags,
        manual_review_required,
        user_id
      )
      VALUES (
        $1, $2, $3::jsonb, $4, $5, $6, $7, $8, 'France',
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, '[]'::jsonb, NULL, $18::jsonb, $19, $20
      )
      RETURNING id
    `,
    [
      data.isActive ?? isApproved,
      data.homePhotoUrls[0],
      JSON.stringify(data.homePhotoUrls),
      validationStatus,
      data.hostLevel,
      data.activatedAt,
      data.lat,
      data.lng,
      data.city,
      data.district,
      data.address,
      addressVerified,
      homePhotoVerified,
      verificationScore,
      autoReviewNotes,
      data.rejectionReason || null,
      reviewedAt,
      JSON.stringify(verificationRiskFlags),
      data.manualReviewRequired ?? !isApproved,
      data.userId,
    ],
  );
  return rows[0].id;
}

async function insertMeal(client, data) {
  const rows = await queryRows(
    client,
    `
      INSERT INTO meals (
        host_id,
        title,
        meal_type,
        menu_description,
        meal_photo_url,
        date_time,
        seats_total,
        price_per_seat_cents,
        house_rules,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `,
    [
      data.hostId,
      data.title,
      data.mealType,
      data.menuDescription,
      data.mealPhotoUrl,
      data.dateTime,
      data.seatsTotal,
      data.pricePerSeatCents,
      data.houseRules,
      data.status,
    ],
  );
  return rows[0].id;
}

async function insertMenuItems(client, mealId, template) {
  const items = [
    ['starter', pick(template.starters || ['Salade de saison', 'Houmous citronné', 'Velouté maison', 'Tartinade aux herbes'])],
    ['main', template.main],
    ['dessert', pick(template.desserts || ['Tarte aux pommes', 'Mousse au chocolat', 'Compote cannelle', 'Panna cotta'])],
    ['drinks', pick(template.drinks || defaultDrinks)],
  ];

  for (const [position, item] of items.entries()) {
    await client.query(
      `
        INSERT INTO meal_menu_items (meal_id, category, label, position)
        VALUES ($1, $2, $3, $4)
      `,
      [mealId, item[0], item[1], position],
    );
  }
}

async function assignMealTags(client, mealId, tagIds, baseTags, template) {
  const photoKey = getMealPhotoKey(template);
  const extraTags = [
    random() < 0.42 ? 'ambiance-decontractee' : null,
    random() < 0.16 ? 'flexitarien' : null,
    random() < 0.14 ? 'repas-en-plein-air' : null,
    random() < 0.08 ? 'sans-gluten' : null,
    random() < 0.05 ? 'soiree-jeux' : null,
    random() < 0.05 ? 'echange-linguistique' : null,
    random() < 0.04 ? 'sans-ecrans' : null,
  ].filter(Boolean);

  if (vegetarianMealPhotoKeys.has(photoKey) && random() < 0.32) {
    extraTags.push('vegetarien');
  }

  if (veganMealPhotoKeys.has(photoKey) && random() < 0.16) {
    extraTags.push('vegan');
  }

  if (halalMealPhotoKeys.has(photoKey) && random() < 0.12) {
    extraTags.push('halal');
  }

  if (noPorkMealPhotoKeys.has(photoKey) && random() < 0.08) {
    extraTags.push('pas-de-porc');
  }

  const rules = [
    'arriver_a_l_heure',
    random() < 0.7 ? 'prevenir_allergie' : null,
    random() < 0.45 ? 'non_fumeur' : null,
    random() < 0.25 ? 'retirer_ses_chaussures' : null,
  ].filter(Boolean);

  const compatibleBaseTags = getCompatibleMealTags(baseTags, photoKey);
  const compatibleExtraTags = getCompatibleMealTags(extraTags, photoKey);
  const uniqueCodes = [...new Set([...compatibleBaseTags, ...compatibleExtraTags, ...rules])];
  for (const code of uniqueCodes) {
    const tagId = tagIds.get(code);
    if (!tagId) {
      continue;
    }
    await client.query(
      `
        INSERT INTO meal_tag_assignments (meal_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (meal_id, tag_id) DO NOTHING
      `,
      [mealId, tagId],
    );
  }
}

async function assignUserPreferences(client, userId, preferenceTagIds) {
  const codes = [
    pick(['vegetarien', 'flexitarien', 'sans-gluten', 'halal', 'vegan', 'pas-de-porc']),
    pick([
      'discussions-enrichissantes',
      'ambiance-decontractee',
      'decouverte-culinaire',
      'repas-calme',
      'cuisine-du-monde',
      'soiree-jeux',
    ]),
  ];

  for (const code of [...new Set(codes)]) {
    const tagId = preferenceTagIds.get(code);
    if (!tagId) {
      continue;
    }
    await client.query(
      `
        INSERT INTO user_preference_tags (user_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, tag_id) DO NOTHING
      `,
      [userId, tagId],
    );
  }
}

async function insertBooking(client, data) {
  const rows = await queryRows(
    client,
    `
      INSERT INTO bookings (
        guest_user_id,
        meal_id,
        seats,
        booking_status,
        payment_method,
        payment_state,
        unit_price_cents,
        total_price_cents,
        confirmed_at,
        refused_at,
        cancelled_at,
        completed_at,
        refusal_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `,
    [
      data.guestUserId,
      data.mealId,
      data.seats,
      data.bookingStatus,
      data.paymentMethod,
      data.paymentState,
      data.unitPriceCents,
      data.totalPriceCents,
      data.confirmedAt,
      data.refusedAt,
      data.cancelledAt,
      data.completedAt,
      data.refusalReason,
    ],
  );
  return rows[0].id;
}

async function insertPayment(client, booking) {
  const platformFee = Math.round(booking.totalPriceCents * 0.15);
  const rows = await queryRows(
    client,
    `
      INSERT INTO payments (
        booking_id,
        provider,
        provider_intent_id,
        amount_total_cents,
        platform_fee_cents,
        host_amount_cents,
        status,
        paid_at,
        released_at,
        refunded_at
      )
      VALUES ($1, 'stripe', $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [
      booking.id,
      `pi_demo_${booking.id}_${Date.now()}`,
      booking.totalPriceCents,
      platformFee,
      booking.totalPriceCents - platformFee,
      booking.paymentStatus,
      booking.paidAt,
      booking.releasedAt,
      booking.refundedAt,
    ],
  );
  return rows[0].id;
}

async function insertConversation(client, data) {
  const rows = await queryRows(
    client,
    `
      INSERT INTO message_conversations (type, title, meal_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [data.type, data.title, data.mealId],
  );
  return rows[0].id;
}

async function insertConversationMember(client, conversationId, userId, role, joinedAt) {
  await client.query(
    `
      INSERT INTO message_conversation_members (
        conversation_id,
        user_id,
        role,
        last_read_at,
        joined_at
      )
      VALUES ($1, $2, $3, $4, $4)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `,
    [conversationId, userId, role, joinedAt],
  );
}

async function insertMessages(client, conversationId, members, count, startDate, bank) {
  if (count <= 0) {
    return;
  }

  for (let index = 0; index < count; index += 1) {
    const sender = members[index % members.length];
    const body = bank[index % bank.length];
    const createdAt = new Date(startDate);
    createdAt.setMinutes(createdAt.getMinutes() + index * randomInt(4, 35));
    await client.query(
      `
        INSERT INTO message_entries (conversation_id, sender_user_id, body, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [conversationId, sender.userId, body, createdAt],
    );
  }
}

async function createDirectConversation(client, booking, meal, hostId, guestId, messageCount) {
  const conversationId = await insertConversation(client, {
    type: 'booking_direct',
    title: `Réservation - ${meal.title}`,
    mealId: meal.id,
  });
  const joinedAt = booking.createdAt;
  await insertConversationMember(client, conversationId, hostId, 'host', joinedAt);
  await insertConversationMember(client, conversationId, guestId, 'guest', joinedAt);
  await insertMessages(
    client,
    conversationId,
    [
      { userId: guestId },
      { userId: hostId },
    ],
    messageCount,
    joinedAt,
    directMessages,
  );
  return conversationId;
}

function bookingStatusForMeal(meal) {
  if (meal.status === 'cancelled') {
    return random() < 0.7 ? 'cancelled' : 'refused';
  }
  if (meal.status === 'done') {
    return random() < 0.82 ? 'completed' : pick(['cancelled', 'refused']);
  }
  if (meal.status === 'published') {
    return random() < 0.72 ? 'confirmed' : pick(['pending', 'refused', 'cancelled']);
  }
  return 'pending';
}

function paymentStateForBooking(status) {
  if (status === 'completed') {
    return { state: 'awaiting_host', paymentStatus: 'succeeded' };
  }
  if (status === 'confirmed') {
    return { state: 'authorized', paymentStatus: 'authorized' };
  }
  if (status === 'cancelled' || status === 'refused') {
    return { state: 'refunded', paymentStatus: 'refunded' };
  }
  return { state: 'authorized', paymentStatus: 'pending' };
}

async function createReview(client, booking, index) {
  if (booking.bookingStatus !== 'completed' || random() > 0.72) {
    return null;
  }

  const rating = random() < 0.82 ? randomInt(4, 5) : 3;
  const rows = await queryRows(
    client,
    `
      INSERT INTO reviews (booking_id, rating, comment, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [
      booking.id,
      rating,
      reviewComments[index % reviewComments.length],
      addDays(booking.mealDateTime, 1, randomInt(9, 21), randomInt(0, 50)),
    ],
  );

  if (random() < 0.22) {
    await client.query(
      `
        INSERT INTO tips (
          booking_id,
          review_id,
          amount_cents,
          payment_id,
          status,
          paid_at
        )
        VALUES ($1, $2, $3, $4, 'succeeded', $5)
      `,
      [
        booking.id,
        rows[0].id,
        pick([100, 200, 300, 500]),
        `tip_demo_${booking.id}`,
        addDays(booking.mealDateTime, 1, randomInt(10, 22), randomInt(0, 50)),
      ],
    );
  }

  return rows[0].id;
}

async function createReports(client, context) {
  const reasons = [
    'inappropriate_behavior',
    'harassment',
    'safety',
    'fraud',
    'spam',
    'wrong_information',
    'payment',
    'hygiene',
    'other',
  ];
  const statuses = ['pending', 'in_review', 'resolved', 'dismissed'];

  for (let index = 0; index < REPORT_COUNT; index += 1) {
    const targetKind = ['user', 'meal', 'booking', 'conversation'][index % 4];
    const reporter = pick(context.guests);
    const admin = index % 3 === 0 ? null : context.admins[index % context.admins.length];
    const status = statuses[index % statuses.length];
    const baseParams = {
      reporterUserId: reporter.id,
      targetType: targetKind,
      targetId: null,
      reportedUserId: null,
      reportedMealId: null,
      reportedBookingId: null,
      reportedConversationId: null,
      reason: reasons[index % reasons.length],
      description: [
        'Signalement de démonstration pour vérifier la modération.',
        'Le comportement décrit doit être vérifié par un administrateur.',
        'Cas ajouté dans la seed afin de présenter le parcours admin.',
      ][index % 3],
      status,
      adminNote: admin ? 'Signalement consulté pendant la démonstration.' : null,
      reviewedByUserId: admin ? admin.id : null,
      reviewedAt: admin ? new Date() : null,
    };

    if (targetKind === 'user') {
      const reportedUser = pick(context.hosts).userId;
      baseParams.targetId = reportedUser;
      baseParams.reportedUserId = reportedUser;
    } else if (targetKind === 'meal') {
      const meal = pick(context.meals);
      baseParams.targetId = meal.id;
      baseParams.reportedMealId = meal.id;
    } else if (targetKind === 'booking') {
      const booking = pick(context.bookings);
      baseParams.targetId = booking.id;
      baseParams.reportedBookingId = booking.id;
    } else {
      const conversation = pick(context.conversations);
      baseParams.targetId = conversation.id;
      baseParams.reportedConversationId = conversation.id;
    }

    await client.query(
      `
        INSERT INTO reports (
          reporter_user_id,
          target_type,
          target_id,
          reported_user_id,
          reported_meal_id,
          reported_booking_id,
          reported_conversation_id,
          reason,
          description,
          status,
          admin_note,
          reviewed_by_user_id,
          reviewed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        baseParams.reporterUserId,
        baseParams.targetType,
        baseParams.targetId,
        baseParams.reportedUserId,
        baseParams.reportedMealId,
        baseParams.reportedBookingId,
        baseParams.reportedConversationId,
        baseParams.reason,
        baseParams.description,
        baseParams.status,
        baseParams.adminNote,
        baseParams.reviewedByUserId,
        baseParams.reviewedAt,
      ],
    );
  }
}

function writeAccountsFile(accounts, scenarios) {
  const secretsDir = path.resolve(__dirname, '..', 'secrets');
  fs.mkdirSync(secretsDir, { recursive: true });

  const lines = [
    'RamèneTaPoire - Comptes de démonstration',
    `Généré le ${new Date().toISOString()}`,
    '',
    `Mot de passe commun : ${DEMO_PASSWORD}`,
    `Domaine email : ${DEMO_EMAIL_DOMAIN}`,
    '',
    'Comptes conseillés pour la présentation',
    ...scenarios.map(
      (scenario) =>
        `- ${scenario.label} : ${scenario.fullName || scenario.pseudo} - ${scenario.email} / ${DEMO_PASSWORD} (${scenario.note})`,
    ),
    '',
    'Tous les comptes',
    'role;nom;email;mot_de_passe;pseudo;ville;note',
    ...accounts.map((account) =>
      [
        account.role,
        account.fullName || '',
        account.email,
        DEMO_PASSWORD,
        account.pseudo,
        account.city,
        account.note || '',
      ].join(';'),
    ),
    '',
  ];

  fs.writeFileSync(path.join(secretsDir, 'demo-accounts.txt'), lines.join('\n'), 'utf8');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est manquant.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const accounts = [];
  const context = {
    admins: [],
    hosts: [],
    hostRequests: [],
    guests: [],
    meals: [],
    bookings: [],
    conversations: [],
  };

  try {
    await assertDemoCanRun(client);

    await client.query('BEGIN');
    if (process.env.DEMO_SEED_RESET === 'true') {
      if (process.env.DEMO_SEED_FULL_RESET === 'false') {
        await deleteDemoData(client);
      } else {
        await deleteAllSeedData(client);
      }
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const roleIds = {
      USER: await ensureRole(client, 'USER'),
      HOST: await ensureRole(client, 'HOST'),
      ADMIN: await ensureRole(client, 'ADMIN'),
    };
    const mealTagIds = await ensureMealTags(client);
    const preferenceTagIds = await ensurePreferenceTags(client);

    for (let index = 1; index <= ADMIN_COUNT; index += 1) {
      const city = cities[index % cities.length];
      const person = makePerson(index, index === 2 ? 'male' : 'female');
      const email = makeEmail(person, index);
      const pseudo = makePseudo(person, index);
      const userId = await insertUser(client, {
        pseudo,
        email,
        passwordHash,
        firstName: person.firstName,
        lastName: person.lastName,
        avatarUrl: makeAvatarUrl(person, index),
        city: city.name,
        bio: makeBio('admin', city.name, person.firstName),
        birthDate: `198${index}-02-0${index}`,
        roleId: roleIds.ADMIN,
      });
      const account = {
        id: userId,
        role: 'ADMIN',
        fullName: person.fullName,
        email,
        pseudo,
        city: city.name,
        note: 'modération et administration',
      };
      context.admins.push(account);
      accounts.push(account);
    }

    for (let index = 1; index <= HOST_COUNT; index += 1) {
      const city = pickPriorityHostCity(index);
      const district = pick(city.districts);
      const coords = offsetCoordinate(city, city.weight >= 18 ? 7 : 4);
      const globalIndex = ADMIN_COUNT + index;
      const person = makePerson(globalIndex);
      const pseudo = makePseudo(person, globalIndex);
      const email = makeEmail(person, globalIndex);
      const address = makeAddress(city, index);
      const photos = makeHomePhotos(index);

      const userId = await insertUser(client, {
        pseudo,
        email,
        passwordHash,
        firstName: person.firstName,
        lastName: person.lastName,
        avatarUrl: makeAvatarUrl(person, globalIndex),
        city: city.name,
        bio: makeBio('host', city.name, person.firstName),
        birthDate: `${1980 + (index % 18)}-${pad((index % 12) + 1, 2)}-${pad((index % 25) + 1, 2)}`,
        roleId: roleIds.HOST,
      });

      const hostProfileId = await insertHostProfile(client, {
        userId,
        homePhotoUrls: photos,
        hostLevel: 1 + (index % 4),
        activatedAt: addDays(new Date(), -randomInt(20, 260), 10, 0),
        lat: coords.lat,
        lng: coords.lng,
        city: city.name,
        district,
        address,
        verificationScore: randomInt(88, 100),
      });

      await client.query(
        `
          INSERT INTO host_profile_review_logs (
            host_profile_id,
            admin_user_id,
            decision,
            rejection_reason,
            created_at
          )
          VALUES ($1, $2, 'approved', NULL, $3)
        `,
        [
          hostProfileId,
          context.admins[index % context.admins.length].id,
          addDays(new Date(), -randomInt(15, 240), 11, 0),
        ],
      );

      await assignUserPreferences(client, userId, preferenceTagIds);
      await client.query(
        `
          INSERT INTO push_notification_preferences (
            user_id,
            messages_enabled,
            reservations_enabled,
            meal_reminders_enabled,
            host_status_enabled
          )
          VALUES ($1, true, true, true, true)
        `,
        [userId],
      );

      const account = {
        id: userId,
        userId,
        role: 'HOST',
        fullName: person.fullName,
        email,
        pseudo,
        city: city.name,
        district,
        lat: coords.lat,
        lng: coords.lng,
        address,
        note: 'hôte validé avec photos de logement',
      };
      context.hosts.push(account);
      accounts.push(account);
    }

    for (let index = 1; index <= HOST_REQUEST_COUNT; index += 1) {
      const isRejected = index > HOST_REQUEST_PENDING_COUNT;
      const requestIndex = isRejected ? index - HOST_REQUEST_PENDING_COUNT : index;
      const validationStatus = isRejected ? 'rejected' : 'pending';
      const city = weightedPick(cities);
      const district = pick(city.districts);
      const coords = offsetCoordinate(city, city.weight >= 18 ? 5 : 3);
      const globalIndex = ADMIN_COUNT + HOST_COUNT + index;
      const person = makePerson(globalIndex);
      const pseudo = makePseudo(person, globalIndex);
      const email = makeEmail(person, globalIndex);
      const address = makeAddress(city, HOST_COUNT + index);
      const photos = makeHomePhotos(HOST_COUNT + index);
      const reviewedAt = addDays(new Date(), -randomInt(isRejected ? 18 : 8, isRejected ? 90 : 18), 14, 0);
      const rejectionReason = isRejected ? hostRequestRejectionReasons[(requestIndex - 1) % hostRequestRejectionReasons.length] : null;

      const userId = await insertUser(client, {
        pseudo,
        email,
        passwordHash,
        firstName: person.firstName,
        lastName: person.lastName,
        avatarUrl: makeAvatarUrl(person, globalIndex),
        city: city.name,
        bio: `${person.firstName} souhaite devenir hôte à ${city.name} et partager des repas maison.`,
        birthDate: `${1982 + (index % 18)}-${pad((index % 12) + 1, 2)}-${pad((index % 25) + 1, 2)}`,
        roleId: roleIds.USER,
      });

      const hostProfileId = await insertHostProfile(client, {
        userId,
        homePhotoUrls: photos,
        hostLevel: 1,
        activatedAt: null,
        lat: coords.lat,
        lng: coords.lng,
        city: city.name,
        district,
        address,
        validationStatus,
        isActive: false,
        addressVerified: !isRejected || requestIndex % 2 === 0,
        homePhotoVerified: false,
        verificationScore: isRejected ? randomInt(32, 66) : randomInt(72, 91),
        autoReviewNotes: isRejected
          ? `Candidature refusée pour la démo admin. ${rejectionReason}`
          : 'Adresse vérifiée. Photos du logement à contrôler manuellement avant validation.',
        rejectionReason,
        lastAutoReviewedAt: reviewedAt,
        verificationRiskFlags: isRejected ? ['manual_review_required'] : [],
        manualReviewRequired: true,
      });

      if (isRejected) {
        await client.query(
          `
            INSERT INTO host_profile_review_logs (
              host_profile_id,
              admin_user_id,
              decision,
              rejection_reason,
              created_at
            )
            VALUES ($1, $2, 'rejected', $3, $4)
          `,
          [
            hostProfileId,
            context.admins[requestIndex % context.admins.length].id,
            rejectionReason,
            reviewedAt,
          ],
        );
      }

      await assignUserPreferences(client, userId, preferenceTagIds);
      await client.query(
        `
          INSERT INTO push_notification_preferences (
            user_id,
            messages_enabled,
            reservations_enabled,
            meal_reminders_enabled,
            host_status_enabled
          )
          VALUES ($1, true, true, true, true)
        `,
        [userId],
      );

      const account = {
        id: userId,
        userId,
        hostProfileId,
        role: isRejected ? 'DEMANDE HÔTE REFUSÉE' : 'DEMANDE HÔTE EN ATTENTE',
        fullName: person.fullName,
        email,
        pseudo,
        city: city.name,
        district,
        lat: coords.lat,
        lng: coords.lng,
        address,
        note: isRejected
          ? `candidature hôte refusée - ${rejectionReason}`
          : 'candidature hôte en attente visible dans l’admin',
      };
      context.hostRequests.push({ ...account, validationStatus });
      accounts.push(account);
    }

    for (let index = 1; index <= GUEST_COUNT; index += 1) {
      const city = weightedPick(cities);
      const globalIndex = ADMIN_COUNT + HOST_COUNT + HOST_REQUEST_COUNT + index;
      const person = makePerson(globalIndex);
      const pseudo = makePseudo(person, globalIndex);
      const email = makeEmail(person, globalIndex);
      const userId = await insertUser(client, {
        pseudo,
        email,
        passwordHash,
        firstName: person.firstName,
        lastName: person.lastName,
        avatarUrl: makeAvatarUrl(person, globalIndex),
        city: city.name,
        bio: makeBio('guest', city.name, person.firstName),
        birthDate: `${1978 + (index % 25)}-${pad((index % 12) + 1, 2)}-${pad((index % 26) + 1, 2)}`,
        roleId: roleIds.USER,
      });
      await assignUserPreferences(client, userId, preferenceTagIds);
      if (index % 2 === 0) {
        await client.query(
          `
            INSERT INTO push_notification_preferences (
              user_id,
              messages_enabled,
              reservations_enabled,
              meal_reminders_enabled,
              host_status_enabled
            )
            VALUES ($1, true, true, true, false)
          `,
          [userId],
        );
      }
      const account = {
        id: userId,
        role: 'INVITÉ',
        fullName: person.fullName,
        email,
        pseudo,
        city: city.name,
        note: 'invité démo',
      };
      context.guests.push(account);
      accounts.push(account);
    }

    const parisHost = context.hosts.find((host) => host.city === 'Paris') || context.hosts[0];
    const rennesHost = context.hosts.find((host) => host.city === 'Rennes') || context.hosts[1] || context.hosts[0];
    const showcaseMealCases = [
      { kind: 'host-draft', host: parisHost, status: 'draft', timing: 'future' },
      { kind: 'host-upcoming', host: parisHost, status: 'published', timing: 'future' },
      { kind: 'host-today', host: parisHost, status: 'published', timing: 'today' },
      { kind: 'host-past', host: parisHost, status: 'done', timing: 'past' },
      { kind: 'host-cancelled', host: parisHost, status: 'cancelled', timing: 'future' },
      { kind: 'guest-pending', host: rennesHost, status: 'published', timing: 'future' },
      { kind: 'guest-refused', host: rennesHost, status: 'published', timing: 'future' },
      { kind: 'guest-cancelled', host: rennesHost, status: 'cancelled', timing: 'future' },
      { kind: 'guest-group', host: rennesHost, status: 'published', timing: 'future' },
    ];

    const now = new Date();
    for (let index = 1; index <= MEAL_COUNT; index += 1) {
      const showcaseCase = showcaseMealCases[index - 1];
      const host = showcaseCase?.host || context.hosts[index % context.hosts.length];
      const template = mealTemplates[(index - 1) % mealTemplates.length];
      const isPast = index % 100 < 25;
      const isToday = index % 100 >= 25 && index % 100 < 32;
      const isCancelled = index % 29 === 0;
      const isDraft = index % 37 === 0;
      const mealHour = template.type === 'Brunch' ? 11 : template.type === 'Déjeuner' ? 12 : template.type === 'Goûter' ? 16 : 19;
      const dateTime = showcaseCase
        ? makeShowcaseMealDate(now, showcaseCase.timing, index, mealHour)
        : isPast
        ? addDays(now, -randomInt(2, 140), mealHour, pick([0, 15, 30, 45]))
        : isToday
          ? addDays(now, randomInt(0, 1), mealHour, pick([0, 15, 30, 45]))
          : addDays(now, randomInt(2, 150), mealHour, pick([0, 15, 30, 45]));
      const status = showcaseCase?.status || (isDraft ? 'draft' : isCancelled ? 'cancelled' : isPast ? 'done' : 'published');
      const seatsTotal = randomInt(4, 10);
      const price = makeMealPriceCents(template);
      const mealTitle = makeMealTitle(template, host, index);
      const mealId = await insertMeal(client, {
        hostId: host.userId,
        title: mealTitle,
        mealType: template.type,
        mealPhotoUrl: makeMealPhotoUrl(template),
        menuDescription: makeMealDescription(template),
        dateTime,
        seatsTotal,
        pricePerSeatCents: price,
        houseRules: "Prévenir en cas de retard, respecter le logement et signaler les allergies à l'avance.",
        status,
      });
      await insertMenuItems(client, mealId, template);
      await assignMealTags(client, mealId, mealTagIds, template.tags, template);

      context.meals.push({
        id: mealId,
        hostId: host.userId,
        host,
        title: mealTitle,
        status,
        dateTime,
        seatsTotal,
        pricePerSeatCents: price,
        showcaseKind: showcaseCase?.kind || null,
      });
    }

    const showcaseMeals = new Map(
      context.meals
        .filter((meal) => meal.showcaseKind)
        .map((meal) => [meal.showcaseKind, meal]),
    );
    const bookingPairKeys = new Set();

    async function createDemoBooking(mealKind, guest, bookingStatus, messageCount = 6) {
      const meal = showcaseMeals.get(mealKind);
      if (!meal || !guest) {
        return null;
      }

      const pairKey = `${meal.id}:${guest.id}`;
      if (bookingPairKeys.has(pairKey)) {
        return null;
      }

      const paymentState = paymentStateForBooking(bookingStatus);
      const createdAt = addDays(meal.dateTime, -randomInt(6, 24), randomInt(9, 18), randomInt(0, 55));
      const confirmedAt = ['confirmed', 'completed'].includes(bookingStatus)
        ? addDays(createdAt, 1, randomInt(9, 20), randomInt(0, 55))
        : null;
      const refusedAt = bookingStatus === 'refused' ? addDays(createdAt, 1, 10, 15) : null;
      const cancelledAt = bookingStatus === 'cancelled' ? addDays(createdAt, 2, 14, 30) : null;
      const completedAt = bookingStatus === 'completed' ? addDays(meal.dateTime, 0, 23, 0) : null;
      const totalPriceCents = meal.pricePerSeatCents;

      const bookingId = await insertBooking(client, {
        guestUserId: guest.id,
        mealId: meal.id,
        seats: 1,
        bookingStatus,
        paymentMethod: pick(['card', 'apple-pay', 'paypal']),
        paymentState: paymentState.state,
        unitPriceCents: meal.pricePerSeatCents,
        totalPriceCents,
        confirmedAt,
        refusedAt,
        cancelledAt,
        completedAt,
        refusalReason: bookingStatus === 'refused' ? 'L’hôte ne peut finalement pas accueillir cette demande.' : null,
      });

      const booking = {
        id: bookingId,
        mealId: meal.id,
        guestUserId: guest.id,
        hostId: meal.hostId,
        bookingStatus,
        totalPriceCents,
        paymentStatus: paymentState.paymentStatus,
        paidAt: ['authorized', 'succeeded', 'refunded'].includes(paymentState.paymentStatus) ? confirmedAt || createdAt : null,
        releasedAt: bookingStatus === 'completed' ? addDays(meal.dateTime, 1, 10, 0) : null,
        refundedAt: bookingStatus === 'cancelled' || bookingStatus === 'refused' ? cancelledAt || refusedAt : null,
        createdAt,
        mealDateTime: meal.dateTime,
      };

      await insertPayment(client, booking);
      if (bookingStatus !== 'refused') {
        await createDirectConversation(client, booking, meal, meal.hostId, guest.id, messageCount);
      }
      await createReview(client, booking, randomInt(0, reviewComments.length - 1));
      context.bookings.push(booking);
      bookingPairKeys.add(pairKey);
      return booking;
    }

    const activeGuest = context.guests[0];
    const messagingGuest = context.guests[1];
    const extraGroupGuest = context.guests[2];

    await createDemoBooking('guest-pending', activeGuest, 'pending', 5);
    await createDemoBooking('host-upcoming', activeGuest, 'confirmed', 8);
    await createDemoBooking('host-today', activeGuest, 'confirmed', 8);
    await createDemoBooking('host-past', activeGuest, 'completed', 5);
    await createDemoBooking('guest-refused', activeGuest, 'refused', 0);
    await createDemoBooking('guest-cancelled', activeGuest, 'cancelled', 3);
    await createDemoBooking('guest-group', activeGuest, 'confirmed', 12);
    await createDemoBooking('guest-group', messagingGuest, 'confirmed', 12);
    await createDemoBooking('guest-group', extraGroupGuest, 'confirmed', 12);

    for (const [mealIndex, meal] of context.meals.entries()) {
      if (meal.status === 'draft') {
        continue;
      }

      const desiredBookings = Math.min(
        meal.seatsTotal,
        meal.status === 'done' ? randomInt(2, meal.seatsTotal) : randomInt(0, meal.seatsTotal),
      );
      const usedGuests = new Set();

      for (let index = 0; index < desiredBookings; index += 1) {
        let guest = pick(context.guests);
        let guard = 0;
        while ((usedGuests.has(guest.id) || bookingPairKeys.has(`${meal.id}:${guest.id}`)) && guard < 80) {
          guest = pick(context.guests);
          guard += 1;
        }
        if (usedGuests.has(guest.id) || bookingPairKeys.has(`${meal.id}:${guest.id}`)) {
          continue;
        }
        usedGuests.add(guest.id);

        const bookingStatus = bookingStatusForMeal(meal);
        const paymentState = paymentStateForBooking(bookingStatus);
        const createdAt = addDays(meal.dateTime, -randomInt(4, 40), randomInt(8, 22), randomInt(0, 55));
        const confirmedAt = ['confirmed', 'completed'].includes(bookingStatus)
          ? addDays(createdAt, randomInt(0, 2), randomInt(9, 20), randomInt(0, 55))
          : null;
        const refusedAt = bookingStatus === 'refused' ? addDays(createdAt, 1, 10, 15) : null;
        const cancelledAt = bookingStatus === 'cancelled' ? addDays(createdAt, randomInt(1, 3), 14, 30) : null;
        const completedAt = bookingStatus === 'completed' ? addDays(meal.dateTime, 0, 23, 0) : null;
        const seats = random() < 0.18 ? 2 : 1;
        const totalPriceCents = seats * meal.pricePerSeatCents;

        const bookingId = await insertBooking(client, {
          guestUserId: guest.id,
          mealId: meal.id,
          seats,
          bookingStatus,
          paymentMethod: pick(['card', 'apple-pay', 'paypal']),
          paymentState: paymentState.state,
          unitPriceCents: meal.pricePerSeatCents,
          totalPriceCents,
          confirmedAt,
          refusedAt,
          cancelledAt,
          completedAt,
          refusalReason: bookingStatus === 'refused' ? 'Plus assez de places disponibles.' : null,
        });

        const booking = {
          id: bookingId,
          mealId: meal.id,
          guestUserId: guest.id,
          hostId: meal.hostId,
          bookingStatus,
          totalPriceCents,
          paymentStatus: paymentState.paymentStatus,
          paidAt: ['authorized', 'succeeded', 'refunded'].includes(paymentState.paymentStatus) ? confirmedAt || createdAt : null,
          releasedAt: bookingStatus === 'completed' ? addDays(meal.dateTime, 1, 10, 0) : null,
          refundedAt: bookingStatus === 'cancelled' || bookingStatus === 'refused' ? cancelledAt || refusedAt : null,
          createdAt,
          mealDateTime: meal.dateTime,
        };
        await insertPayment(client, booking);
        if (bookingStatus !== 'refused') {
          await createDirectConversation(
            client,
            booking,
            meal,
            meal.hostId,
            guest.id,
            random() < 0.08 ? randomInt(25, 55) : randomInt(1, 8),
          );
        }
        await createReview(client, booking, mealIndex + index);
        context.bookings.push(booking);
        bookingPairKeys.add(`${meal.id}:${guest.id}`);
      }
    }

    const bookingsByMeal = new Map();
    for (const booking of context.bookings) {
      const list = bookingsByMeal.get(booking.mealId) || [];
      list.push(booking);
      bookingsByMeal.set(booking.mealId, list);
    }

    for (const meal of context.meals) {
      const bookings = bookingsByMeal.get(meal.id) || [];
      const acceptedBookings = bookings.filter((booking) =>
        ['confirmed', 'completed'].includes(booking.bookingStatus),
      );
      if (acceptedBookings.length === 0) {
        continue;
      }

      const conversationId = await insertConversation(client, {
        type: 'meal_group',
        title: `Discussion repas : ${meal.title}`,
        mealId: meal.id,
      });
      const members = [{ userId: meal.hostId, role: 'host' }];
      for (const booking of acceptedBookings) {
        members.push({ userId: booking.guestUserId, role: 'participant' });
      }
      for (const member of members) {
        await insertConversationMember(client, conversationId, member.userId, member.role, addDays(meal.dateTime, -7, 12, 0));
      }
      await insertMessages(
        client,
        conversationId,
        members,
        random() < 0.12 ? randomInt(30, 60) : randomInt(0, 18),
        addDays(meal.dateTime, -5, 18, 0),
        groupMessages,
      );
      context.conversations.push({ id: conversationId, mealId: meal.id, type: 'meal_group' });

      const participantIds = [...new Set(acceptedBookings.map((booking) => booking.guestUserId))];
      const pairCount = Math.min(participantIds.length > 2 ? 2 : 1, participantIds.length - 1);
      for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        const firstUserId = participantIds[pairIndex];
        const secondUserId = participantIds[pairIndex + 1];
        if (!firstUserId || !secondUserId) {
          continue;
        }
        const directId = await insertConversation(client, {
          type: 'meal_direct',
          title: `Discussion participant - ${meal.title}`,
          mealId: meal.id,
        });
        await insertConversationMember(client, directId, firstUserId, 'participant', addDays(meal.dateTime, -3, 13, 0));
        await insertConversationMember(client, directId, secondUserId, 'participant', addDays(meal.dateTime, -3, 13, 0));
        await insertMessages(
          client,
          directId,
          [{ userId: firstUserId }, { userId: secondUserId }],
          randomInt(1, 6),
          addDays(meal.dateTime, -2, 18, 0),
          directMessages,
        );
        context.conversations.push({ id: directId, mealId: meal.id, type: 'meal_direct' });
      }
    }

    const upcomingBookings = context.bookings
      .filter((booking) => ['confirmed', 'completed'].includes(booking.bookingStatus))
      .slice(0, 120);
    for (const booking of upcomingBookings) {
      await client.query(
        `
          INSERT INTO meal_reminder_notifications (
            meal_id,
            user_id,
            reminder_type,
            target_date_time
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `,
        [
          booking.mealId,
          booking.guestUserId,
          random() < 0.5 ? 'day_before' : 'two_hours_before',
          addDays(booking.mealDateTime, -1, 10, 0),
        ],
      );
    }

    await createReports(client, context);

    await client.query('COMMIT');

    const pendingHostRequest = context.hostRequests.find((request) => request.validationStatus === 'pending');
    const rejectedHostRequest = context.hostRequests.find((request) => request.validationStatus === 'rejected');

    const scenarios = [
      {
        label: 'Administrateur',
        fullName: context.admins[0].fullName,
        email: context.admins[0].email,
        note: 'voir demandes hôte en attente, historique des refus/validations, signalements et modération',
      },
      {
        label: 'Demande hôte en attente',
        fullName: pendingHostRequest.fullName,
        email: pendingHostRequest.email,
        note: 'candidature visible dans la page admin des demandes hôte',
      },
      {
        label: 'Demande hôte refusée',
        fullName: rejectedHostRequest.fullName,
        email: rejectedHostRequest.email,
        note: 'candidature visible dans l’historique admin avec une raison de refus',
      },
      {
        label: 'Hôte Rennes',
        fullName: rennesHost.fullName,
        email: rennesHost.email,
        note: 'profil hôte, photos logement, repas à venir, refusé, annulé et messagerie',
      },
      {
        label: 'Hôte Paris',
        fullName: parisHost.fullName,
        email: parisHost.email,
        note: 'repas brouillon, publié, du jour, passé et annulé dans une grande ville',
      },
      {
        label: 'Invité actif',
        fullName: context.guests[0].fullName,
        email: context.guests[0].email,
        note: 'réservations en attente, acceptées, refusées, annulées, passées et conversations',
      },
      {
        label: 'Invité messagerie',
        fullName: context.guests[1].fullName,
        email: context.guests[1].email,
        note: 'cas utile pour tester les discussions',
      },
    ];
    writeAccountsFile(accounts, scenarios);

    console.log('Seed démo terminée.');
    console.log(`Comptes créés : ${accounts.length}`);
    console.log(`Hôtes : ${context.hosts.length}`);
    console.log(`Demandes hôte en attente : ${context.hostRequests.filter((request) => request.validationStatus === 'pending').length}`);
    console.log(`Demandes hôte refusées : ${context.hostRequests.filter((request) => request.validationStatus === 'rejected').length}`);
    console.log(`Repas : ${context.meals.length}`);
    console.log(`Réservations : ${context.bookings.length}`);
    console.log(`Conversations : ${context.conversations.length}`);
    console.log('Identifiants : backend/secrets/demo-accounts.txt');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
