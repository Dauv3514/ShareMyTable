const path = require('node:path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const seedEmailDomain = 'ramenetapoire.test';

const meals = [
  {
    title: 'Table bretonne au Thabor',
    city: 'Rennes',
    district: 'Thabor',
    address: '12 rue de Paris, 35000 Rennes',
    lat: 48.1144,
    lng: -1.6651,
    dateTime: '2026-06-08T19:30:00',
    price: 18,
    seats: 6,
    type: 'Diner',
    host: ['Maël', 'Le Goff'],
    menu: ['Rillettes de sardines', 'Galettes complètes', 'Far breton'],
  },
  {
    title: 'Brunch maison quartier Centre',
    city: 'Rennes',
    district: 'Centre',
    address: '5 rue Saint-Michel, 35000 Rennes',
    lat: 48.112,
    lng: -1.6819,
    dateTime: '2026-06-09T11:30:00',
    price: 16,
    seats: 5,
    type: 'Brunch',
    host: ['Léna', 'Moreau'],
    menu: ['Granola maison', 'Oeufs brouillés', 'Pancakes aux pommes'],
  },
  {
    title: 'Diner végétarien Sainte-Thérèse',
    city: 'Rennes',
    district: 'Sainte-Thérèse',
    address: '18 boulevard Jacques Cartier, 35000 Rennes',
    lat: 48.0985,
    lng: -1.676,
    dateTime: '2026-06-10T20:00:00',
    price: 20,
    seats: 7,
    type: 'Diner',
    host: ['Camille', 'Denis'],
    menu: ['Houmous citronné', 'Curry de légumes', 'Tarte poire-amande'],
  },
  {
    title: 'Apéro dinatoire à Villejean',
    city: 'Rennes',
    district: 'Villejean',
    address: '31 cours Kennedy, 35000 Rennes',
    lat: 48.1212,
    lng: -1.7042,
    dateTime: '2026-06-11T19:00:00',
    price: 14,
    seats: 8,
    type: 'Apéro',
    host: ['Noé', 'Robert'],
    menu: ['Tartinades maison', 'Mini quiches', 'Salade de fruits'],
  },
  {
    title: 'Repas calme aux Longs-Champs',
    city: 'Rennes',
    district: 'Longs-Champs',
    address: '7 allée Morvan Lebesque, 35700 Rennes',
    lat: 48.1285,
    lng: -1.6358,
    dateTime: '2026-06-12T19:45:00',
    price: 22,
    seats: 4,
    type: 'Diner',
    host: ['Sarah', 'Aubert'],
    menu: ['Velouté de saison', 'Poulet rôti aux herbes', 'Crème vanille'],
  },
  {
    title: 'Déjeuner voisins à Cleunay',
    city: 'Rennes',
    district: 'Cleunay',
    address: '44 rue Jules Lallemand, 35000 Rennes',
    lat: 48.1018,
    lng: -1.6992,
    dateTime: '2026-06-13T12:30:00',
    price: 17,
    seats: 6,
    type: 'Déjeuner',
    host: ['Yanis', 'Baron'],
    menu: ['Salade croquante', 'Lasagnes maison', 'Mousse au chocolat'],
  },
  {
    title: 'Cuisine du monde à Beaulieu',
    city: 'Rennes',
    district: 'Beaulieu',
    address: '23 avenue du Général Leclerc, 35700 Rennes',
    lat: 48.1166,
    lng: -1.6387,
    dateTime: '2026-06-14T20:15:00',
    price: 19,
    seats: 6,
    type: 'Diner',
    host: ['Inès', 'Petit'],
    menu: ['Falafels', 'Riz parfumé aux épices', 'Baklava'],
  },
  {
    title: 'Petit-déjeuner gourmand Arsenal',
    city: 'Rennes',
    district: 'Arsenal-Redon',
    address: '9 rue de Redon, 35000 Rennes',
    lat: 48.1057,
    lng: -1.6878,
    dateTime: '2026-06-15T09:30:00',
    price: 12,
    seats: 5,
    type: 'Petit-déjeuner',
    host: ['Emma', 'Garnier'],
    menu: ['Viennoiseries', 'Confitures maison', 'Jus pressé'],
  },
  {
    title: 'Diner sans écrans à Bourg-l’Évêque',
    city: 'Rennes',
    district: 'Bourg-l’Évêque',
    address: '15 mail François Mitterrand, 35000 Rennes',
    lat: 48.1119,
    lng: -1.6926,
    dateTime: '2026-06-16T19:30:00',
    price: 21,
    seats: 6,
    type: 'Diner',
    host: ['Arthur', 'Lemoine'],
    menu: ['Cake salé', 'Risotto aux champignons', 'Panna cotta'],
  },
  {
    title: 'Goûter partagé à Saint-Hélier',
    city: 'Rennes',
    district: 'Saint-Hélier',
    address: '21 rue Saint-Hélier, 35000 Rennes',
    lat: 48.1076,
    lng: -1.6695,
    dateTime: '2026-06-17T16:00:00',
    price: 10,
    seats: 6,
    type: 'Goûter',
    host: ['Clara', 'Roux'],
    menu: ['Cookies', 'Cake citron', 'Thé glacé maison'],
  },
  {
    title: 'Diner parisien Canal Saint-Martin',
    city: 'Paris',
    district: 'Canal Saint-Martin',
    address: '24 quai de Jemmapes, 75010 Paris',
    lat: 48.8712,
    lng: 2.3656,
    dateTime: '2026-06-18T20:00:00',
    price: 28,
    seats: 5,
    type: 'Diner',
    host: ['Hugo', 'Martin'],
    menu: ['Burrata', 'Pâtes fraîches', 'Tiramisu'],
  },
  {
    title: 'Brunch à Montmartre',
    city: 'Paris',
    district: 'Montmartre',
    address: '8 rue Lamarck, 75018 Paris',
    lat: 48.8872,
    lng: 2.3431,
    dateTime: '2026-06-19T11:00:00',
    price: 24,
    seats: 6,
    type: 'Brunch',
    host: ['Nina', 'Bernard'],
    menu: ['Avocado toast', 'Oeufs pochés', 'Brioche perdue'],
  },
  {
    title: 'Apéro terrasse à Bastille',
    city: 'Paris',
    district: 'Bastille',
    address: '16 rue de Charonne, 75011 Paris',
    lat: 48.8534,
    lng: 2.3745,
    dateTime: '2026-06-20T19:00:00',
    price: 19,
    seats: 8,
    type: 'Apéro',
    host: ['Lola', 'Perrin'],
    menu: ['Tapenade', 'Planche fromages', 'Fruits rouges'],
  },
  {
    title: 'Repas italien à Belleville',
    city: 'Paris',
    district: 'Belleville',
    address: '42 rue de Belleville, 75020 Paris',
    lat: 48.872,
    lng: 2.3896,
    dateTime: '2026-06-21T20:15:00',
    price: 26,
    seats: 6,
    type: 'Diner',
    host: ['Marco', 'Rossi'],
    menu: ['Antipasti', 'Gnocchis sauce tomate', 'Panna cotta'],
  },
  {
    title: 'Déjeuner rive gauche',
    city: 'Paris',
    district: 'Invalides',
    address: '11 rue de Grenelle, 75007 Paris',
    lat: 48.857,
    lng: 2.3185,
    dateTime: '2026-06-22T12:45:00',
    price: 25,
    seats: 4,
    type: 'Déjeuner',
    host: ['Alice', 'Durand'],
    menu: ['Soupe froide', 'Quiche légumes', 'Tarte citron'],
  },
  {
    title: 'Table nantaise près de Graslin',
    city: 'Nantes',
    district: 'Graslin',
    address: '4 rue Crébillon, 44000 Nantes',
    lat: 47.2145,
    lng: -1.5601,
    dateTime: '2026-06-23T19:30:00',
    price: 18,
    seats: 6,
    type: 'Diner',
    host: ['Paul', 'Mercier'],
    menu: ['Mâche nantaise', 'Poisson au beurre blanc', 'Gâteau nantais'],
  },
  {
    title: 'Brunch sur l’île de Nantes',
    city: 'Nantes',
    district: 'Île de Nantes',
    address: '12 boulevard de la Prairie au Duc, 44200 Nantes',
    lat: 47.2052,
    lng: -1.5551,
    dateTime: '2026-06-24T11:30:00',
    price: 17,
    seats: 5,
    type: 'Brunch',
    host: ['Manon', 'Briand'],
    menu: ['Tartines', 'Omelette fine', 'Salade de fruits'],
  },
  {
    title: 'Soirée jeux à Talensac',
    city: 'Nantes',
    district: 'Talensac',
    address: '6 rue Talensac, 44000 Nantes',
    lat: 47.2215,
    lng: -1.5584,
    dateTime: '2026-06-25T20:00:00',
    price: 15,
    seats: 7,
    type: 'Diner',
    host: ['Jules', 'Colin'],
    menu: ['Dips maison', 'Chili doux', 'Brownie'],
  },
  {
    title: 'Déjeuner végétal à Procé',
    city: 'Nantes',
    district: 'Procé',
    address: '29 boulevard des Anglais, 44100 Nantes',
    lat: 47.2242,
    lng: -1.5812,
    dateTime: '2026-06-26T12:15:00',
    price: 16,
    seats: 6,
    type: 'Déjeuner',
    host: ['Zoé', 'Renard'],
    menu: ['Taboulé herbes', 'Dahl de lentilles', 'Compote cannelle'],
  },
  {
    title: 'Bouchon lyonnais maison',
    city: 'Lyon',
    district: 'Croix-Rousse',
    address: '18 boulevard de la Croix-Rousse, 69001 Lyon',
    lat: 45.7745,
    lng: 4.8324,
    dateTime: '2026-06-27T20:00:00',
    price: 23,
    seats: 6,
    type: 'Diner',
    host: ['Baptiste', 'Faure'],
    menu: ['Salade lyonnaise', 'Quenelles', 'Tarte praline'],
  },
  {
    title: 'Brunch à la Guillotière',
    city: 'Lyon',
    district: 'Guillotière',
    address: '10 cours Gambetta, 69007 Lyon',
    lat: 45.7531,
    lng: 4.8432,
    dateTime: '2026-06-28T11:15:00',
    price: 18,
    seats: 5,
    type: 'Brunch',
    host: ['Mila', 'Roche'],
    menu: ['Babka', 'Oeufs au plat', 'Yaourt fruits'],
  },
  {
    title: 'Diner calme à Monplaisir',
    city: 'Lyon',
    district: 'Monplaisir',
    address: '36 avenue des Frères Lumière, 69008 Lyon',
    lat: 45.7457,
    lng: 4.8701,
    dateTime: '2026-06-29T19:45:00',
    price: 21,
    seats: 4,
    type: 'Diner',
    host: ['Élise', 'Marchand'],
    menu: ['Velouté courgette', 'Gratin dauphinois', 'Clafoutis'],
  },
  {
    title: 'Apéro au Vieux Lyon',
    city: 'Lyon',
    district: 'Vieux Lyon',
    address: '7 rue Saint-Jean, 69005 Lyon',
    lat: 45.7621,
    lng: 4.8272,
    dateTime: '2026-06-30T18:45:00',
    price: 16,
    seats: 8,
    type: 'Apéro',
    host: ['Tom', 'Girard'],
    menu: ['Cervelle de canut', 'Mini tartes', 'Poires rôties'],
  },
  {
    title: 'Diner bordelais Saint-Pierre',
    city: 'Bordeaux',
    district: 'Saint-Pierre',
    address: '14 rue Parlement Sainte-Catherine, 33000 Bordeaux',
    lat: 44.8399,
    lng: -0.5718,
    dateTime: '2026-07-01T20:00:00',
    price: 24,
    seats: 6,
    type: 'Diner',
    host: ['Chloé', 'Giraud'],
    menu: ['Cannelés salés', 'Magret aux pommes', 'Cannelé'],
  },
  {
    title: 'Brunch aux Chartrons',
    city: 'Bordeaux',
    district: 'Chartrons',
    address: '22 cours Portal, 33000 Bordeaux',
    lat: 44.8527,
    lng: -0.5712,
    dateTime: '2026-07-02T11:30:00',
    price: 19,
    seats: 5,
    type: 'Brunch',
    host: ['Victor', 'Blanc'],
    menu: ['Pain perdu', 'Fromage frais', 'Fruits de saison'],
  },
  {
    title: 'Déjeuner à Saint-Michel',
    city: 'Bordeaux',
    district: 'Saint-Michel',
    address: '9 place Meynard, 33000 Bordeaux',
    lat: 44.8341,
    lng: -0.5654,
    dateTime: '2026-07-03T12:45:00',
    price: 17,
    seats: 6,
    type: 'Déjeuner',
    host: ['Anaïs', 'Chevalier'],
    menu: ['Salade de tomates', 'Tian de légumes', 'Financier'],
  },
  {
    title: 'Table méditerranéenne au Panier',
    city: 'Marseille',
    district: 'Le Panier',
    address: '3 rue du Panier, 13002 Marseille',
    lat: 43.3008,
    lng: 5.3675,
    dateTime: '2026-07-04T20:00:00',
    price: 22,
    seats: 6,
    type: 'Diner',
    host: ['Nadia', 'Saidi'],
    menu: ['Panisses', 'Poisson grillé', 'Navettes'],
  },
  {
    title: 'Apéro vue sur Castellane',
    city: 'Marseille',
    district: 'Castellane',
    address: '16 avenue du Prado, 13006 Marseille',
    lat: 43.2853,
    lng: 5.3837,
    dateTime: '2026-07-05T19:00:00',
    price: 16,
    seats: 8,
    type: 'Apéro',
    host: ['Romain', 'Lopez'],
    menu: ['Anchoïade', 'Fougasse', 'Abricots rôtis'],
  },
  {
    title: 'Diner alsacien Petite France',
    city: 'Strasbourg',
    district: 'Petite France',
    address: '5 rue des Moulins, 67000 Strasbourg',
    lat: 48.5819,
    lng: 7.741,
    dateTime: '2026-07-06T19:45:00',
    price: 21,
    seats: 6,
    type: 'Diner',
    host: ['Louise', 'Schmitt'],
    menu: ['Bretzel', 'Tarte flambée', 'Kougelhopf'],
  },
  {
    title: 'Brunch au Neudorf',
    city: 'Strasbourg',
    district: 'Neudorf',
    address: '20 route du Polygone, 67100 Strasbourg',
    lat: 48.5658,
    lng: 7.7605,
    dateTime: '2026-07-07T11:30:00',
    price: 18,
    seats: 5,
    type: 'Brunch',
    host: ['Gabriel', 'Meyer'],
    menu: ['Knepfle poêlées', 'Oeufs mollets', 'Tarte aux quetsches'],
  },
];

const menuCategories = ['starter', 'main', 'dessert'];

function pseudoFromMeal(meal, index) {
  return `seed-map-${String(index + 1).padStart(2, '0')}-${meal.city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est manquant dans backend/.env');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    const existingUsers = await client.query(
      'SELECT id FROM users WHERE email LIKE $1',
      [`seed-map-%@${seedEmailDomain}`],
    );
    const existingUserIds = existingUsers.rows.map((row) => row.id);

    if (existingUserIds.length > 0) {
      await client.query(
        'DELETE FROM meal_menu_items WHERE meal_id IN (SELECT id FROM meals WHERE host_id = ANY($1::int[]))',
        [existingUserIds],
      );
      await client.query(
        'DELETE FROM meal_tag_assignments WHERE meal_id IN (SELECT id FROM meals WHERE host_id = ANY($1::int[]))',
        [existingUserIds],
      );
      await client.query('DELETE FROM meals WHERE host_id = ANY($1::int[])', [
        existingUserIds,
      ]);
      await client.query('DELETE FROM host_profiles WHERE user_id = ANY($1::int[])', [
        existingUserIds,
      ]);
      await client.query('DELETE FROM users WHERE id = ANY($1::int[])', [
        existingUserIds,
      ]);
    }

    const roleResult = await client.query(
      `
        INSERT INTO roles (name)
        VALUES ('HOST')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `,
    );
    const hostRoleId = roleResult.rows[0].id;

    for (const [index, meal] of meals.entries()) {
      const pseudo = pseudoFromMeal(meal, index);
      const [firstName, lastName] = meal.host;

      const userResult = await client.query(
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
            $1,
            $2,
            NULL,
            NULL,
            $3,
            $4,
            '/homme-profil.jpg',
            $5,
            'France',
            $6,
            '1992-04-12',
            NOW(),
            'local',
            true,
            'active',
            $7
          )
          RETURNING id
        `,
        [
          pseudo,
          `${pseudo}@${seedEmailDomain}`,
          firstName,
          lastName,
          meal.city,
          `Profil de test pour vérifier la recherche carte à ${meal.city}.`,
          hostRoleId,
        ],
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `
          INSERT INTO host_profiles (
            is_active,
            home_photo_url,
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
            true,
            '/photoRepas.png',
            'approved',
            1,
            NOW(),
            $1,
            $2,
            'France',
            $3,
            $4,
            $5,
            true,
            true,
            100,
            'Profil de test approuvé automatiquement pour les tests de carte.',
            NULL,
            NOW(),
            '[]'::jsonb,
            NULL,
            '[]'::jsonb,
            false,
            $6
          )
        `,
        [meal.lat, meal.lng, meal.city, meal.district, meal.address, userId],
      );

      const mealResult = await client.query(
        `
          INSERT INTO meals (
            host_id,
            title,
            meal_type,
            menu_description,
            date_time,
            seats_total,
            price_per_seat_cents,
            house_rules,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5::timestamp,
            $6,
            $7,
            $8,
            'published'
          )
          RETURNING id
        `,
        [
          userId,
          meal.title,
          meal.type,
          meal.menu.join(', '),
          meal.dateTime,
          meal.seats,
          meal.price * 100,
          'Respecter le logement, prévenir en cas de retard, ambiance conviviale.',
        ],
      );
      const mealId = mealResult.rows[0].id;

      for (const [position, label] of meal.menu.entries()) {
        await client.query(
          `
            INSERT INTO meal_menu_items (meal_id, category, label, position)
            VALUES ($1, $2, $3, $4)
          `,
          [mealId, menuCategories[position], label, position],
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Seed terminé : ${meals.length} repas futurs ajoutés.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
