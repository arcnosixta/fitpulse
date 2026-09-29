/**
 * Food database — values per 100 g of edible portion.
 *
 * Tuple layout:
 * [id, name_ru, name_en, category, kcal, protein, fat, carbs, fiber,
 *  sodium_mg, iron_mg, calcium_mg, potassium_mg, tags]
 *
 * Sources for the reference numbers: USDA FoodData Central (SR Legacy) and
 * Skurikhin, «Справочник по составу пищевых продуктов» — rounded to 1 decimal.
 * Milk/dairy rows use the usual Russian retail fat content.
 *
 * tags: vegan, vegetarian, gf (gluten-free), lf (lactose-free),
 *       hp (high protein ≥20 g), hf (high fiber ≥5 g)
 *
 * `k` etc. are NOT unit-aware: multiply by grams / 100.
 */

export const FOOD_CATEGORIES = {
  protein: { n: 'Мясо и рыба', en: 'Meat & fish', glyph: '🍗' },
  eggs: { n: 'Яйца', en: 'Eggs', glyph: '🥚' },
  dairy: { n: 'Молочное', en: 'Dairy', glyph: '🥛' },
  grain: { n: 'Крупы и хлеб', en: 'Grains & bread', glyph: '🌾' },
  legume: { n: 'Бобовые', en: 'Legumes', glyph: '🫘' },
  veg: { n: 'Овощи', en: 'Vegetables', glyph: '🥦' },
  fruit: { n: 'Фрукты и ягоды', en: 'Fruits & berries', glyph: '🍎' },
  nut: { n: 'Орехи и семена', en: 'Nuts & seeds', glyph: '🥜' },
  fat: { n: 'Масла и жиры', en: 'Oils & fats', glyph: '🫒' },
  sweet: { n: 'Сладости', en: 'Sweets', glyph: '🍫' },
  drink: { n: 'Напитки', en: 'Drinks', glyph: '🥤' },
  ready: { n: 'Готовая еда', en: 'Ready meals', glyph: '🍲' },
  supp: { n: 'Спортпит', en: 'Sports nutrition', glyph: '🥤' },
};

const F = (
  id, n, en, cat, k, p, f, c, fib, na, fe, ca, po, tags = []
) => ({ id, n, en, cat, k, p, f, c, fib, na, fe, ca, po, tags });

export const FOODS = [
  /* ================= МЯСО / ПТИЦА ================= */
  F('chicken-breast-raw', 'Куриная грудка, сырая', 'Chicken breast, raw', 'protein', 120, 23.6, 2.6, 0.4, 0, 74, 0.7, 15, 256, ['gf', 'lf', 'hp']),
  F('chicken-breast-cooked', 'Куриная грудка, запечённая', 'Chicken breast, roasted', 'protein', 165, 31, 3.6, 0, 0, 74, 1, 15, 256, ['gf', 'lf', 'hp']),
  F('chicken-thigh-raw', 'Бедро куриное, сырое', 'Chicken thigh, raw', 'protein', 121, 19.7, 4.5, 0, 0, 84, 0.9, 12, 230, ['gf', 'lf']),
  F('chicken-leg-roasted', 'Голень куриная, запечённая', 'Chicken drumstick, roasted', 'protein', 180, 24, 9, 0, 0, 90, 1.1, 12, 250, ['gf', 'lf']),
  F('chicken-wing-roasted', 'Крылышки куриные, запечённые', 'Chicken wing, roasted', 'protein', 203, 26, 11, 0, 0, 90, 1, 12, 250, ['gf', 'lf']),
  F('turkey-breast', 'Филе индейки', 'Turkey breast', 'protein', 135, 29, 1, 0, 0, 55, 0.7, 12, 250, ['gf', 'lf', 'hp']),
  F('duck-breast', 'Утка, грудка без кожи', 'Duck breast, skinless', 'protein', 137, 19, 7, 0, 0, 65, 1.3, 12, 230, ['gf', 'lf']),
  F('beef-brisket', 'Говядина, грудинка', 'Beef brisket', 'protein', 265, 18, 21, 0, 0, 60, 1.9, 9, 310, ['gf', 'lf']),
  F('beef-tenderloin', 'Говядина, вырезка', 'Beef tenderloin', 'protein', 158, 22.2, 6.6, 0, 0, 55, 2.1, 9, 330, ['gf', 'lf', 'hp']),
  F('beef-ribeye', 'Говядина, рёбра', 'Beef ribeye', 'protein', 291, 24.9, 21.8, 0, 0, 54, 2.4, 8, 340, ['gf', 'lf', 'hp']),
  F('beef-mince-5', 'Говядина фарш 5%', 'Beef mince 5%', 'protein', 137, 16.2, 7, 0, 0, 60, 1.9, 12, 280, ['gf', 'lf']),
  F('beef-mince-10', 'Говядина фарш 10%', 'Beef mince 10%', 'protein', 176, 17, 10.4, 0, 0, 62, 1.9, 12, 280, ['gf', 'lf']),
  F('pork-tenderloin', 'Свинина, вырезка', 'Pork tenderloin', 'protein', 143, 21.3, 6.2, 0, 0, 57, 1.1, 6, 370, ['gf', 'lf']),
  F('pork-loin', 'Свинина, корейка', 'Pork loin', 'protein', 218, 17.8, 15, 0, 0, 55, 0.7, 8, 340, ['gf', 'lf']),
  F('pork-bacon-raw', 'Бекон свиной, сырой', 'Pork bacon, raw', 'protein', 407, 9.9, 41.8, 0.4, 0, 700, 0.6, 6, 150, ['gf', 'lf']),
  F('ham-boiled', 'Ветчина варёная', 'Boiled ham', 'protein', 145, 21, 5.5, 1.5, 0, 1200, 0.8, 8, 250, ['gf']),
  F('lamb', 'Баранина, мякоть', 'Lamb', 'protein', 258, 16.5, 20.4, 0, 0, 70, 1.7, 9, 300, ['gf', 'lf']),
  F('veal', 'Телятина', 'Veal', 'protein', 160, 19.4, 7.9, 0, 0, 58, 1.4, 10, 320, ['gf', 'lf']),
  F('sausage-boiled', 'Колбаса варёная', 'Boiled sausage', 'protein', 269, 13.6, 22.8, 2, 0, 900, 0.9, 20, 150, ['lf']),
  F('salami', 'Салат', 'Salami', 'protein', 310, 17.2, 22, 1.6, 0, 1200, 1, 30, 200, ['gf']),

  /* ================= РЫБА / МОРЕПРОДУКТЫ ================= */
  F('salmon', 'Лосось, сырой', 'Salmon, raw', 'protein', 208, 20.4, 13.4, 0, 0, 63, 0.3, 9, 363, ['gf', 'lf', 'hp']),
  F('salmon-cooked', 'Лосось, запечённый', 'Salmon, baked', 'protein', 206, 22.1, 12.4, 0, 0, 61, 0.3, 15, 380, ['gf', 'lf', 'hp']),
  F('trout', 'Форель', 'Trout', 'protein', 190, 18.4, 13.4, 0, 0, 51, 0.3, 14, 363, ['gf', 'lf']),
  F('tuna-water', 'Тунец в собственном соку', 'Tuna, canned in water', 'protein', 116, 25.5, 1, 0, 0, 247, 1.4, 8, 237, ['gf', 'lf', 'hp']),
  F('tuna-oil', 'Тунец в масле', 'Tuna, canned in oil', 'protein', 192, 24.4, 8.1, 0, 0, 292, 1.4, 8, 250, ['gf', 'lf', 'hp']),
  F('cod', 'Треска', 'Cod', 'protein', 82, 17.8, 0.7, 0, 0, 66, 0.3, 42, 244, ['gf', 'lf']),
  F('tilapia', 'Тилапия', 'Tilapia', 'protein', 96, 20.1, 1.7, 0, 0, 52, 0.3, 10, 380, ['gf', 'lf']),
  F('pangasius', 'Пангасиус', 'Pangasius', 'protein', 90, 15.7, 2.5, 0, 0, 55, 0.4, 12, 380, ['gf', 'lf']),
  F('mackerel', 'Скумбрия', 'Mackerel', 'protein', 262, 18, 23.5, 0, 0, 90, 1.7, 12, 390, ['gf', 'lf', 'hp']),
  F('herring', 'Сельдь', 'Herring', 'protein', 158, 18.3, 9, 0, 0, 60, 1, 28, 330, ['gf', 'lf']),
  F('surstrimaki', 'Сёртремака', 'Sour cream herring', 'protein', 129, 17.6, 5.2, 0, 0, 750, 0.9, 90, 300, ['lf']),
  F('shrimp', 'Креветки, сырые', 'Shrimp, raw', 'protein', 99, 24, 0.3, 0.2, 0, 111, 2.4, 70, 264, ['gf', 'lf', 'hp']),
  F('calamari', 'Кальмар', 'Squid', 'protein', 92, 15.6, 0.8, 3.4, 0, 246, 0.7, 43, 246, ['gf', 'lf']),
  F('mussels', 'Мидии', 'Mussels', 'protein', 42, 5.5, 1.7, 3.9, 0, 286, 3.9, 26, 320, ['gf', 'lf']),
  F('octopus', 'Осьминог', 'Octopus', 'protein', 83, 14.9, 0.9, 0, 0, 230, 5.3, 53, 350, ['gf', 'lf']),
  F('roe-red', 'Икра красная', 'Salmon roe', 'protein', 264, 28.3, 13.6, 1.6, 0, 2700, 6.5, 87, 330, ['gf', 'lf', 'hp']),
  F('caviar-black', 'Чёрная икра', 'Black caviar', 'protein', 235, 24, 14, 1, 0, 2300, 8.6, 85, 320, ['gf', 'lf']),

  /* ================= ЯЙЦА ================= */
  F('egg-whole', 'Яйцо куриное целое', 'Egg, whole, raw', 'eggs', 143, 12.6, 9.5, 0.7, 0, 142, 1.8, 27, 126, ['gf', 'lf']),
  F('egg-white', 'Яичный белок', 'Egg white', 'eggs', 52, 10.9, 0.2, 0.7, 0, 166, 0.1, 7, 163, ['gf', 'lf']),
  F('egg-yolk', 'Яичный желток', 'Egg yolk', 'eggs', 352, 15.2, 31, 3.4, 0, 170, 3.5, 129, 336, ['gf', 'lf']),
  F('egg-omelet', 'Омлет из 2 яиц (на 100 г)', 'Omelette (per 100 g)', 'eggs', 165, 11, 12.6, 1.1, 0, 200, 1.4, 60, 150, ['gf', 'lf']),

  /* ================= МОЛОЧНОЕ ================= */
  F('milk-2.5', 'Молоко 2.5%', 'Milk 2.5%', 'dairy', 54, 3, 2.5, 3.4, 0, 44, 0.1, 120, 140, ['gf', 'vegetarian']),
  F('milk-1.5', 'Молоко 1.5%', 'Milk 1.5%', 'dairy', 44, 3, 1.5, 4.8, 0, 42, 0.1, 120, 150, ['gf', 'vegetarian']),
  F('milk-skim', 'Молоко обезжиренное', 'Skim milk', 'dairy', 34, 3.4, 0.1, 5, 0, 42, 0.1, 125, 156, ['gf', 'vegetarian']),
  F('kefir-2.5', 'Кефир 2.5%', 'Kefir 2.5%', 'dairy', 52, 2.9, 2.5, 4, 0, 40, 0.1, 120, 140, ['gf', 'vegetarian']),
  F('ryazhenka', 'Ряженка 2.5%', 'Ryazhenka 2.5%', 'dairy', 52, 2.5, 2.5, 4.8, 0, 45, 0.1, 120, 145, ['gf', 'vegetarian']),
  F('cottage-2', 'Творог 2%', 'Cottage cheese 2%', 'dairy', 103, 17, 2, 3, 0, 55, 0.1, 120, 130, ['gf', 'vegetarian']),
  F('cottage-5', 'Творог 5%', 'Cottage cheese 5%', 'dairy', 145, 17, 5, 3, 0, 60, 0.1, 130, 140, ['gf', 'vegetarian']),
  F('cottage-9', 'Творог 9%', 'Cottage cheese 9%', 'dairy', 166, 17, 9, 3, 0, 64, 0.1, 120, 130, ['gf', 'vegetarian']),
  F('tvorozhnaya-massa', 'Творожная масса 18%', 'Cream cheese 18%', 'dairy', 227, 15, 17, 3, 0, 70, 0.2, 110, 130, ['gf', 'vegetarian']),
  F('greek-yogurt', 'Греческий йогурт 2%', 'Greek yogurt 2%', 'dairy', 73, 9.8, 1.9, 3.9, 0, 36, 0.1, 115, 150, ['gf', 'vegetarian']),
  F('yogurt', 'Йогурт 2.5%', 'Yogurt 2.5%', 'dairy', 85, 3.8, 2.6, 12.6, 0, 60, 0.2, 120, 160, ['gf', 'vegetarian']),
  F('kefir-drink', 'Кефирный напиток', 'Kefir drink', 'dairy', 70, 2.5, 1.5, 12, 0, 50, 0.1, 100, 140, ['gf', 'vegetarian']),
  F('sour-cream-15', 'Сметана 15%', 'Sour cream 15%', 'dairy', 160, 2.8, 15, 3.6, 0, 40, 0.1, 70, 130, ['gf', 'vegetarian']),
  F('smetana-20', 'Сметана 20%', 'Sour cream 20%', 'dairy', 209, 2.5, 20, 3.6, 0, 40, 0.1, 70, 130, ['gf', 'vegetarian']),
  F('butter-72', 'Масло сливочное 72%', 'Butter 72%', 'dairy', 537, 0.9, 60, 0.8, 0, 40, 0.1, 24, 24, ['gf', 'vegetarian']),
  F('cheese-russian', 'Сыр твердый, 17%', 'Russian cheese 17%', 'dairy', 340, 23, 26, 2.5, 0, 1100, 0.2, 700, 90, ['vegetarian']),
  F('cheese-gouda', 'Сыр Гауда', 'Gouda cheese', 'dairy', 356, 25, 27, 2.5, 0, 900, 0.2, 700, 100, ['vegetarian']),
  F('cheese-cheddar', 'Сыр Чеддер', 'Cheddar cheese', 'dairy', 402, 25, 33, 1.3, 0, 653, 0.2, 721, 98, ['vegetarian']),
  F('cheese-parmesan', 'Пармезан', 'Parmesan', 'dairy', 420, 38, 28, 4.1, 0, 1600, 0.9, 1100, 130, ['vegetarian']),
  F('cheese-mozzarella', 'Моцарелла', 'Mozzarella', 'dairy', 280, 27, 17, 3, 0, 620, 0.4, 500, 76, ['vegetarian']),
  F('cheese-feta', 'Фета', 'Feta', 'dairy', 264, 14.2, 21.3, 4.1, 0, 917, 0.7, 493, 62, ['vegetarian']),
  F('cheese-suluguni', 'Сулугуни', 'Suluguni', 'dairy', 350, 23, 26, 1.5, 0, 990, 0.3, 730, 90, ['vegetarian']),
  F('cheese-cream', 'Сыр творожный', 'Cream cheese', 'dairy', 342, 6.3, 34, 3.4, 0, 320, 0.2, 110, 130, ['gf', 'vegetarian']),
  F('milk-oat', 'Овсяное молоко', 'Oat milk', 'dairy', 60, 1, 2.5, 7, 0.8, 42, 0.3, 120, 120, ['vegan']),
  F('milk-almond', 'Миндальное молоко', 'Almond milk', 'dairy', 15, 0.4, 1.2, 0.6, 0.3, 7, 0.1, 7, 20, ['vegan', 'gf']),
  F('milk-soy', 'Соевое молоко', 'Soy milk', 'dairy', 43, 3.2, 1.8, 4.9, 0.6, 42, 0.6, 120, 120, ['vegan', 'gf']),

  /* ================= КРУПЫ / ХЛЕБ ================= */
  F('oats-dry', 'Овсяные хлопья, сухие', 'Oats, dry', 'grain', 379, 13.2, 6.5, 67.7, 10.6, 2, 4.3, 54, 362, ['gf', 'vegetarian', 'hf']),
  F('oats-cooked', 'Овсяная каша на воде', 'Oat porridge, cooked', 'grain', 71, 2.5, 1.5, 12, 1.7, 1, 0.6, 12, 70, ['gf', 'vegetarian']),
  F('buckwheat-dry', 'Гречневая крупа, сухая', 'Buckwheat, dry', 'grain', 343, 12.6, 3.3, 62.1, 10, 1, 2.7, 17, 460, ['gf', 'vegetarian', 'hf']),
  F('buckwheat-cooked', 'Гречка варёная', 'Buckwheat, boiled', 'grain', 90, 3.2, 0.7, 18.6, 2.7, 2, 0.7, 7, 80, ['gf', 'vegetarian']),
  F('rice-white-dry', 'Рис белый, сухой', 'White rice, dry', 'grain', 365, 7.1, 0.7, 78.9, 1.3, 4, 1.3, 10, 110, ['gf', 'vegetarian']),
  F('rice-white-cooked', 'Рис белый варёный', 'White rice, boiled', 'grain', 130, 2.7, 0.3, 28.2, 0.4, 1, 0.2, 10, 35, ['gf', 'vegetarian']),
  F('rice-brown-dry', 'Рис бурый, сухой', 'Brown rice, dry', 'grain', 360, 7.5, 2.7, 72, 3, 4, 1.5, 13, 220, ['gf', 'vegetarian', 'hf']),
  F('pasta-dry', 'Макароны, сухие', 'Pasta, dry', 'grain', 371, 13, 1.5, 74.7, 3.2, 6, 1.6, 19, 264, ['vegetarian']),
  F('pasta-cooked', 'Макароны варёные', 'Pasta, boiled', 'grain', 158, 5.8, 0.9, 30.9, 1.8, 1, 0.5, 7, 44, ['vegetarian']),
  F('pasta-whole', 'Паста из твёрдых сортов', 'Whole-wheat pasta', 'grain', 348, 14.6, 2.5, 69, 9, 4, 5.3, 50, 400, ['vegetarian', 'hf']),
  F('bread-wheat', 'Хлеб пшеничный', 'Wheat bread', 'grain', 265, 9, 1.2, 50.8, 2.7, 450, 2.5, 30, 130, ['vegetarian']),
  F('bread-whole', 'Хлеб цельнозерновой', 'Whole-grain bread', 'grain', 247, 13, 3.4, 41.3, 7, 400, 2.7, 70, 230, ['vegetarian', 'hf']),
  F('bread-rye', 'Хлеб ржаной', 'Rye bread', 'grain', 210, 6.6, 1.2, 41.7, 10.5, 600, 2.9, 30, 200, ['vegetarian', 'hf']),
  F('bread-bagel', 'Бейгл', 'Bagel', 'grain', 257, 10, 1.5, 50.5, 2.1, 470, 2.4, 20, 120, ['vegetarian']),
  F('tortilla-wheat', 'Пшеничная тортилья', 'Flour tortilla', 'grain', 306, 8.2, 7.7, 51.4, 3, 640, 2.4, 24, 130, ['vegetarian']),
  F('tortilla-corn', 'Кукурузная тортилья', 'Corn tortilla', 'grain', 218, 5.7, 2.9, 44.6, 6.3, 45, 3.5, 52, 130, ['gf', 'vegan', 'vegetarian']),
  F('rice-cake', 'Рисовые хлебцы', 'Rice cakes', 'grain', 387, 8.2, 3.2, 81.5, 4.2, 30, 1.1, 11, 275, ['gf', 'vegan', 'vegetarian']),
  F('cornflakes', 'Кукурузные хлопья', 'Corn flakes', 'grain', 380, 7, 0.4, 84.1, 3.3, 730, 4.4, 11, 330, ['gf', 'vegan']),
  F('muesli', 'Мюсли', 'Muesli', 'grain', 360, 10, 6, 66, 8, 30, 3, 60, 400, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('granola', 'Гранола', 'Granola', 'grain', 471, 8, 20, 64, 8, 15, 3.5, 50, 330, ['gf', 'vegan', 'hf']),
  F('semolina', 'Манная крупа, сухая', 'Semolina, dry', 'grain', 360, 11, 1, 71, 2.7, 2, 1.6, 8, 107, ['gf', 'vegetarian']),
  F('barley', 'Ячневая крупа, сухая', 'Barley groats, dry', 'grain', 313, 10.4, 1.3, 62.1, 11, 2, 2.7, 20, 350, ['gf', 'vegetarian', 'hf']),
  F('millet', 'Пшено, сухое', 'Millet, dry', 'grain', 348, 11.5, 3.3, 66.5, 8, 2, 2.7, 8, 195, ['gf', 'vegetarian', 'hf']),
  F('quinoa', 'Киноа, сухая', 'Quinoa, dry', 'grain', 368, 14.1, 6.1, 64.2, 7, 7, 4.6, 47, 172, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('couscous', 'Кускус, сухой', 'Couscous', 'grain', 376, 12.8, 0.6, 77.4, 1.4, 5, 1, 8, 58, ['vegetarian']),
  F('breadcrumbs', 'Панировочные сухари', 'Breadcrumbs', 'grain', 395, 9.6, 1.3, 82, 2.7, 700, 4.5, 20, 100, ['vegetarian']),

  /* ================= БОБОВЫЕ ================= */
  F('lentils-boiled', 'Чечевица варёная', 'Lentils, boiled', 'legume', 116, 9, 0.4, 20.1, 7.9, 2, 3.3, 19, 369, ['gf', 'vegan', 'hf']),
  F('chickpeas-boiled', 'Нут варёный', 'Chickpeas, boiled', 'legume', 164, 8.9, 2.6, 27.4, 7.6, 7, 2.9, 49, 291, ['gf', 'vegan', 'hf']),
  F('beans-red', 'Фасоль красная варёная', 'Kidney beans, boiled', 'legume', 127, 8.7, 0.5, 23, 8.4, 3, 2.2, 44, 403, ['gf', 'vegan', 'hf']),
  F('beans-green', 'Фасоль стручковая', 'Green beans', 'legume', 31, 1.8, 0.2, 7, 2.7, 1, 1, 37, 209, ['gf', 'vegan', 'hf']),
  F('peas-green', 'Горох свежий', 'Green peas', 'legume', 81, 5.4, 0.4, 14.5, 5.7, 3, 1.5, 25, 271, ['gf', 'vegan', 'hf']),
  F('edamame', 'Эдамаме', 'Edamame', 'legume', 121, 11.9, 5.2, 8.9, 5.2, 6, 2.3, 63, 436, ['gf', 'vegan', 'hf']),
  F('tofu-firm', 'Тофу плотный', 'Firm tofu', 'legume', 144, 17.3, 8.7, 2.8, 2.3, 14, 2.7, 683, 1213, ['gf', 'vegan', 'hp']),
  F('tempeh', 'Темпе', 'Tempeh', 'legume', 195, 20.3, 10.8, 7.6, 6, 14, 2.7, 210, 412, ['gf', 'vegan', 'hp']),
  F('seitan', 'Сейтан', 'Seitan', 'legume', 141, 24.7, 1.9, 12.3, 0.6, 340, 2.1, 30, 100, ['vegan', 'hp']),
  F('hummus', 'Хумус', 'Hummus', 'legume', 166, 7.9, 9.6, 14.3, 6, 379, 2.4, 49, 228, ['gf', 'vegan', 'hf']),

  /* ================= ОВОЩИ ================= */
  F('broccoli', 'Брокколи', 'Broccoli', 'veg', 35, 2.4, 0.4, 7.2, 3.3, 41, 0.7, 47, 316, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('cauliflower', 'Цветная капуста', 'Cauliflower', 'veg', 25, 1.9, 0.3, 5, 2, 30, 0.5, 22, 299, ['gf', 'vegan', 'hf']),
  F('brussels', 'Брюссельская капуста', 'Brussels sprouts', 'veg', 43, 3.4, 0.3, 9, 3.8, 25, 0.9, 25, 389, ['gf', 'vegan', 'hf']),
  F('kale', 'Кейл', 'Kale', 'veg', 49, 4.3, 0.9, 8.8, 4.1, 38, 1.5, 150, 491, ['gf', 'vegan', 'hf']),
  F('spinach', 'Шпинат', 'Spinach', 'veg', 23, 2.9, 0.4, 3.6, 2.2, 79, 2.7, 99, 558, ['gf', 'vegan', 'hf']),
  F('lettuce', 'Салат листовой', 'Lettuce', 'veg', 15, 1.4, 0.2, 2.9, 1.3, 28, 0.9, 36, 194, ['gf', 'vegan', 'hf']),
  F('cucumber', 'Огурец', 'Cucumber', 'veg', 15, 0.7, 0.1, 3.6, 0.5, 2, 0.5, 24, 147, ['gf', 'vegan', 'hf']),
  F('tomato', 'Помидор', 'Tomato', 'veg', 18, 0.9, 0.2, 3.9, 1.2, 5, 0.4, 10, 237, ['gf', 'vegan', 'hf']),
  F('cherry-tomato', 'Черри', 'Cherry tomatoes', 'veg', 18, 0.9, 0.2, 3.9, 1.2, 5, 0.4, 10, 237, ['gf', 'vegan', 'hf']),
  F('carrot', 'Морковь', 'Carrot', 'veg', 41, 0.9, 0.2, 9.6, 2.8, 69, 0.3, 33, 320, ['gf', 'vegan', 'hf']),
  F('beetroot', 'Свёкла', 'Beetroot', 'veg', 43, 1.6, 0.2, 10, 2.8, 78, 0.8, 16, 325, ['gf', 'vegan', 'hf']),
  F('potato-boiled', 'Картофель варёный', 'Potato, boiled', 'veg', 87, 1.9, 0.1, 20.1, 1.6, 4, 0.3, 8, 379, ['gf', 'vegan', 'hf']),
  F('potato-baked', 'Картофель печёный', 'Potato, baked', 'veg', 93, 2.5, 0.1, 21.2, 2.2, 10, 0.6, 15, 535, ['gf', 'vegan', 'hf']),
  F('sweet-potato', 'Батат, печёный', 'Sweet potato, baked', 'veg', 90, 2, 0.2, 20.7, 3.3, 36, 0.7, 38, 475, ['gf', 'vegan', 'hf']),
  F('bell-pepper', 'Перец болгарский', 'Bell pepper', 'veg', 31, 1, 0.3, 6, 2.1, 4, 0.4, 7, 211, ['gf', 'vegan', 'hf']),
  F('zucchini', 'Кабачок', 'Zucchini', 'veg', 17, 1.2, 0.3, 3.1, 1, 8, 0.3, 15, 261, ['gf', 'vegan', 'hf']),
  F('eggplant', 'Баклажан', 'Eggplant', 'veg', 25, 1, 0.2, 5.9, 3, 2, 0.3, 9, 229, ['gf', 'vegan', 'hf']),
  F('pumpkin', 'Тыква', 'Pumpkin', 'veg', 26, 1, 0.1, 6.5, 3, 1, 0.4, 21, 337, ['gf', 'vegan', 'hf']),
  F('cabbage-white', 'Капуста белокочанная', 'Cabbage', 'veg', 28, 1.3, 0.1, 6.6, 2.5, 18, 0.6, 49, 350, ['gf', 'vegan', 'hf']),
  F('cabbage-red', 'Капуста краснокочанная', 'Red cabbage', 'veg', 31, 1.4, 0.2, 7.4, 2.1, 27, 0.6, 13, 322, ['gf', 'vegan', 'hf']),
  F('onion', 'Лук репчатый', 'Onion', 'veg', 40, 1.1, 0.1, 9.3, 1.7, 4, 0.2, 23, 146, ['gf', 'vegan', 'hf']),
  F('garlic', 'Чеснок', 'Garlic', 'veg', 149, 6.4, 0.5, 33.1, 2.1, 17, 1.7, 181, 401, ['gf', 'vegan', 'hf']),
  F('leek', 'Лук-порей', 'Leek', 'veg', 61, 1.5, 0.3, 14.2, 1.8, 20, 1.1, 51, 99, ['gf', 'vegan', 'hf']),
  F('mushroom-white', 'Шампиньоны', 'Button mushrooms', 'veg', 27, 4.3, 1, 4.3, 1.2, 5, 0.4, 12, 315, ['gf', 'vegan', 'hf']),
  F('shiitake', 'Шиитаке', 'Shiitake', 'veg', 34, 2.2, 0.5, 6.8, 2.5, 9, 0.4, 2, 553, ['gf', 'vegan', 'hf']),
  F('nori', 'Нори', 'Nori seaweed', 'veg', 207, 26.5, 1, 44, 41.4, 708, 8.6, 183, 306, ['gf', 'vegan', 'hf']),
  F('asparagus', 'Спаржа', 'Asparagus', 'veg', 20, 2.2, 0.1, 3.9, 2.1, 2, 1.4, 10, 202, ['gf', 'vegan', 'hf']),
  F('artichoke', 'Артишок', 'Artichoke', 'veg', 47, 3.3, 0.2, 10.5, 5.4, 94, 1.5, 53, 370, ['gf', 'vegan', 'hf']),
  F('corn-sweet', 'Кукуруза сладкая', 'Sweet corn', 'veg', 96, 3.4, 1.5, 21, 2, 15, 1.2, 7, 270, ['gf', 'vegan', 'vegetarian']),
  F('avocado', 'Авокадо', 'Avocado', 'veg', 160, 2, 14.7, 8.5, 6.7, 7, 0.6, 12, 485, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('olives', 'Оливки', 'Olives', 'veg', 143, 0.8, 15.3, 7.9, 3.2, 1420, 0.5, 88, 190, ['gf', 'vegan']),
  F('mushroom-porcini-dry', 'Грибы белые сушёные', 'Porcini, dried', 'veg', 274, 22.4, 1.5, 44, 22, 20, 31, 40, 1600, ['gf', 'vegan', 'hp']),

  /* ================= ФРУКТЫ ================= */
  F('banana', 'Банан', 'Banana', 'fruit', 89, 1.1, 0.3, 22.8, 2.6, 1, 0.3, 5, 358, ['gf', 'vegan', 'hf']),
  F('apple', 'Яблоко', 'Apple', 'fruit', 52, 0.3, 0.2, 13.8, 2.4, 1, 0.1, 6, 107, ['gf', 'vegan', 'hf']),
  F('orange', 'Апельсин', 'Orange', 'fruit', 47, 0.9, 0.1, 9.4, 2.4, 0, 0.1, 40, 181, ['gf', 'vegan', 'hf']),
  F('tangerine', 'Мандарин', 'Tangerine', 'fruit', 51, 0.8, 0.2, 11.8, 1.9, 2, 0.1, 33, 166, ['gf', 'vegan', 'hf']),
  F('grapefruit', 'Грейпфрут', 'Grapefruit', 'fruit', 42, 0.8, 0.2, 10.7, 2, 1, 0.1, 27, 166, ['gf', 'vegan', 'hf']),
  F('grapes', 'Виноград', 'Grapes', 'fruit', 69, 0.7, 0.2, 18.1, 0.9, 2, 0.4, 10, 191, ['gf', 'vegan']),
  F('strawberry', 'Клубника', 'Strawberries', 'fruit', 32, 0.7, 0.3, 7.7, 2, 1, 0.4, 16, 153, ['gf', 'vegan']),
  F('blueberry', 'Черника', 'Blueberries', 'fruit', 57, 0.7, 0.3, 14.5, 2.4, 1, 0.3, 6, 77, ['gf', 'vegan']),
  F('raspberry', 'Малина', 'Raspberries', 'fruit', 52, 1.2, 0.7, 11.9, 6.5, 1, 0.6, 25, 151, ['gf', 'vegan', 'hf']),
  F('kiwi', 'Киви', 'Kiwi', 'fruit', 61, 1.1, 0.5, 14.7, 3, 3, 0.3, 27, 312, ['gf', 'vegan', 'hf']),
  F('mango', 'Манго', 'Mango', 'fruit', 60, 0.8, 0.4, 15, 1.6, 1, 0.4, 11, 168, ['gf', 'vegan']),
  F('pineapple', 'Ананас', 'Pineapple', 'fruit', 50, 0.5, 0.1, 13.1, 1.4, 1, 0.4, 13, 109, ['gf', 'vegan']),
  F('watermelon', 'Арбуз', 'Watermelon', 'fruit', 30, 0.6, 0.2, 7.6, 0.4, 1, 0.4, 7, 112, ['gf', 'vegan']),
  F('melon', 'Дыня', 'Melon', 'fruit', 34, 0.8, 0.2, 8.2, 0.9, 16, 0.4, 15, 267, ['gf', 'vegan']),
  F('peach', 'Персик', 'Peach', 'fruit', 39, 0.9, 0.3, 9.5, 1.3, 0, 0.3, 5, 190, ['gf', 'vegan']),
  F('pear', 'Груша', 'Pear', 'fruit', 57, 0.4, 0.1, 15.2, 3.1, 1, 0.3, 9, 116, ['gf', 'vegan', 'hf']),
  F('plum', 'Слива', 'Plum', 'fruit', 46, 0.7, 0.3, 11.4, 1.5, 0, 0.3, 7, 171, ['gf', 'vegan']),
  F('cherry', 'Вишня', 'Cherry', 'fruit', 50, 1.1, 0.2, 12.8, 1.1, 0, 0.4, 13, 222, ['gf', 'vegan']),
  F('cranberry', 'Клюква', 'Cranberries', 'fruit', 46, 0.5, 0.2, 9.8, 3.6, 1, 0.5, 8, 85, ['gf', 'vegan', 'hf']),
  F('dates', 'Финики', 'Dates', 'fruit', 277, 1.8, 0.2, 75, 6.7, 3, 0.3, 5, 271, ['gf', 'vegan', 'hf']),
  F('raisins', 'Изюм', 'Raisins', 'fruit', 299, 3.1, 0.2, 79.2, 3.7, 11, 0.8, 8, 749, ['gf', 'vegan', 'hf']),
  F('dried-apricots', 'Курага', 'Dried apricots', 'fruit', 241, 3.4, 0.5, 62.2, 10.7, 4, 2.7, 35, 296, ['gf', 'vegan', 'hf']),
  F('persimmon', 'Хурма', 'Persimmon', 'fruit', 67, 0.4, 0.4, 15.3, 1.9, 1, 0.2, 2, 200, ['gf', 'vegan']),
  F('papaya', 'Папайя', 'Papaya', 'fruit', 30, 0.6, 0.1, 7.6, 1.8, 8, 0.25, 21, 228, ['gf', 'vegan']),
  F('guava', 'Гуава', 'Guava', 'fruit', 68, 2.6, 1, 14.7, 5.4, 1, 0.4, 18, 170, ['gf', 'vegan', 'hf']),

  /* ================= ОРЕХИ / СЕМЕНА ================= */
  F('peanut', 'Арахис', 'Peanuts', 'nut', 567, 25.8, 49.2, 16.1, 8.5, 18, 1.5, 90, 705, ['gf', 'vegan', 'vegetarian', 'hf', 'hp']),
  F('almond', 'Миндаль', 'Almonds', 'nut', 579, 21.2, 49.9, 21.6, 12.5, 1, 3.7, 269, 733, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('walnut', 'Грецкий орех', 'Walnuts', 'nut', 654, 15.2, 65.2, 13.7, 6.7, 2, 2.9, 98, 441, ['gf', 'vegan', 'vegetarian']),
  F('cashew', 'Кешью', 'Cashews', 'nut', 553, 18.2, 43.9, 30.2, 3.3, 12, 6.3, 37, 660, ['gf', 'vegan', 'vegetarian']),
  F('pistachio', 'Фисташки', 'Pistachios', 'nut', 560, 20.2, 45.3, 27.2, 10.3, 1, 3.9, 105, 970, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('hazelnut', 'Фундук', 'Hazelnuts', 'nut', 628, 15, 60.8, 17.6, 9.7, 0, 6.3, 114, 680, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('macadamia', 'Макадамия', 'Macadamia', 'nut', 718, 7.9, 75.8, 13.8, 8.6, 5, 2.4, 105, 660, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('pecan', 'Пекан', 'Pecans', 'nut', 691, 9.2, 72, 13.9, 9.6, 0, 2.5, 98, 680, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('brazil-nut', 'Бразильский орех', 'Brazil nut', 'nut', 659, 14.3, 67.1, 8.7, 4.8, 1, 2.4, 66, 660, ['gf', 'vegan', 'vegetarian']),
  F('sunflower-seed', 'Семена подсолнечника', 'Sunflower seeds', 'nut', 584, 20.8, 51.5, 20, 8.6, 9, 6.8, 79, 491, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('pumpkin-seed', 'Семена тыквы', 'Pumpkin seeds', 'nut', 559, 30.2, 49.1, 10.7, 6, 7, 8.8, 39, 809, ['gf', 'vegan', 'vegetarian', 'hf', 'hp']),
  F('flaxseed', 'Лён', 'Flaxseed', 'nut', 534, 18.3, 42.2, 28.9, 27.3, 30, 5.7, 255, 407, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('chia', 'Чиа', 'Chia seeds', 'nut', 486, 16.5, 30.7, 42.1, 34.4, 16, 7.7, 631, 407, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('sesame', 'Кунжут', 'Sesame seeds', 'nut', 573, 17.7, 49.7, 23.4, 11.8, 11, 7.8, 975, 358, ['gf', 'vegan', 'vegetarian', 'hf']),
  F('poppy-seed', 'Маковые семена', 'Poppy seeds', 'nut', 525, 12, 44, 20, 8, 15, 7.3, 100, 170, ['gf', 'vegan', 'vegetarian']),
  F('hemp-seed', 'Конопляное семя', 'Hemp seed', 'nut', 553, 31.6, 48.8, 8.7, 4, 5, 7.9, 6, 600, ['gf', 'vegan', 'vegetarian', 'hp']),

  /* ================= МАСЛА ================= */
  F('olive-oil', 'Оливковое масло', 'Olive oil', 'fat', 884, 0, 100, 0, 0, 2, 0.6, 1, 1, ['gf', 'vegan', 'vegetarian']),
  F('sunflower-oil', 'Подсолнечное масло', 'Sunflower oil', 'fat', 884, 0, 100, 0, 0, 0, 0.1, 1, 1, ['gf', 'vegan', 'vegetarian']),
  F('canola-oil', 'Рапсовое масло', 'Canola oil', 'fat', 884, 0, 100, 0, 0, 0, 0.1, 1, 1, ['gf', 'vegan', 'vegetarian']),
  F('flax-oil', 'Льняное масло', 'Flaxseed oil', 'fat', 884, 0, 100, 0, 0, 0, 0.6, 1, 6, ['gf', 'vegan', 'vegetarian']),
  F('coconut-oil', 'Кокосовое масло', 'Coconut oil', 'fat', 862, 0, 100, 0, 0, 0, 0.5, 1, 1, ['gf', 'vegan', 'vegetarian']),
  F('mayonnaise', 'Майонез', 'Mayonnaise', 'fat', 680, 1, 75, 0.6, 0, 635, 0.2, 8, 20, ['vegetarian']),
  F('peanut-butter', 'Арахисовая паста', 'Peanut butter', 'fat', 588, 25.1, 50, 20, 6, 17, 0.7, 63, 649, ['gf', 'vegan', 'vegetarian', 'hf', 'hp']),

  /* ================= СЛАДОСТИ ================= */
  F('sugar', 'Сахар', 'Sugar', 'sweet', 387, 0, 0, 100, 0, 1, 0.6, 1, 2, ['gf', 'vegan']),
  F('honey', 'Мёд', 'Honey', 'sweet', 304, 0.3, 0, 82.4, 0.2, 4, 0.4, 5, 52, ['gf', 'vegetarian']),
  F('jam', 'Варенье', 'Jam', 'sweet', 250, 0.4, 0.1, 64, 0.5, 6, 0.3, 10, 90, ['gf', 'vegan', 'hf']),
  F('dark-chocolate-70', 'Тёмный шоколад 70%', 'Dark chocolate 70%', 'sweet', 598, 7.8, 42.6, 45.9, 10.9, 20, 11.9, 189, 715, ['gf', 'vegetarian', 'hf']),
  F('milk-chocolate', 'Молочный шоколад', 'Milk chocolate', 'sweet', 545, 5.3, 31.3, 59.4, 3.4, 50, 2.4, 189, 372, ['vegetarian']),
  F('cocoa-powder', 'Какао-порошок', 'Cocoa powder', 'sweet', 228, 19.6, 13.7, 57.9, 37, 21, 56, 131, 660, ['gf', 'vegan', 'hf']),
  F('protein-bar', 'Протеиновый батончик', 'Protein bar', 'sweet', 350, 30, 10, 40, 8, 200, 3, 150, 250, ['vegetarian', 'hf', 'hp']),
  F('milo', 'Мюсли с сахаром', 'Sweetened cereal', 'sweet', 380, 8, 2, 82, 5, 320, 4, 30, 300, ['vegetarian', 'hf']),

  /* ================= НАПИТКИ ================= */
  F('water', 'Вода', 'Water', 'drink', 0, 0, 0, 0, 0, 0, 0, 0, 0, ['gf', 'vegan', 'lf']),
  F('coffee-black', 'Кофе чёрный', 'Black coffee', 'drink', 1, 0.1, 0, 0.2, 0, 2, 0, 5, 49, ['gf', 'vegan', 'lf']),
  F('tea', 'Чай без сахара', 'Tea, unsweetened', 'drink', 1, 0, 0, 0.3, 0, 1, 0, 3, 37, ['gf', 'vegan', 'lf']),
  F('orange-juice', 'Апельсиновый сок', 'Orange juice', 'drink', 45, 0.7, 0.2, 10.4, 0.2, 1, 0.1, 10, 200, ['gf', 'vegan', 'lf']),
  F('cola', 'Кола', 'Cola', 'drink', 42, 0, 0, 10.6, 0, 4, 0, 2, 2, ['gf', 'vegan', 'lf']),
  F('beer', 'Пиво светлое', 'Light beer', 'drink', 43, 0.5, 0, 3.6, 0, 4, 0, 5, 27, ['gf', 'vegan', 'lf', 'alcohol']),
  F('wine-red', 'Вино красное', 'Red wine', 'drink', 85, 0.1, 0, 2.6, 0, 4, 0.5, 8, 104, ['gf', 'vegan', 'lf', 'alcohol']),
  F('sparkling-water', 'Газированная вода', 'Sparkling water', 'drink', 0, 0, 0, 0, 0, 10, 0, 0, 0, ['gf', 'vegan', 'lf']),

  /* ================= ГОТОВАЯ ЕДА ================= */
  F('borscht', 'Борщ', 'Borscht', 'ready', 45, 1.5, 1.5, 7, 0.8, 400, 0.6, 30, 200, ['vegetarian', 'hf']),
  F('okroshka', 'Окрошка на кефире', 'Okroshka', 'ready', 40, 1.5, 1, 7, 0.7, 300, 0.5, 25, 180, ['vegetarian']),
  F('chicken-soup', 'Куриный суп с лапшой', 'Chicken noodle soup', 'ready', 35, 2, 1, 5, 0.4, 600, 0.3, 15, 60, ['lf']),
  F('pizza-margherita', 'Пицца «Маргарита»', 'Pizza margherita', 'ready', 266, 11, 10, 31, 2.3, 600, 1.4, 188, 170, ['vegetarian']),
  F('burger-fastfood', 'Бургер фастфуд', 'Fast-food burger', 'ready', 250, 12, 14, 20, 1.2, 480, 1.2, 60, 250, ['lf']),
  F('shawarma', 'Шаурма с курицей', 'Chicken shawarma', 'ready', 290, 13, 17, 22, 1.5, 520, 1.3, 45, 230, ['lf']),
  F('fries', 'Картофель фри', 'French fries', 'ready', 312, 3.4, 15, 41, 3.8, 210, 0.8, 20, 570, ['vegetarian', 'hf']),
  F('sushi-set', 'Сет роллов', 'Sushi set', 'ready', 145, 6, 1.5, 26, 0.8, 500, 0.5, 15, 120, ['lf']),
  F('sandwich-turkey', 'Сэндвич с индейкой', 'Turkey sandwich', 'ready', 220, 12, 8, 25, 1.4, 480, 1, 60, 200, ['lf']),
  F('dumplings', 'Пельмени', 'Dumplings', 'ready', 240, 9, 9, 30, 1.2, 450, 0.8, 20, 160, ['lf']),

  /* ================= СПОРТПИТ ================= */
  F('whey-concentrate', 'Сывороточный концентрат', 'Whey concentrate', 'supp', 380, 78, 5, 8, 0, 400, 1, 700, 800, ['vegetarian', 'hp']),
  F('whey-isolate', 'Сывороточный изолят', 'Whey isolate', 'supp', 370, 85, 2, 4, 0, 350, 1, 700, 800, ['vegetarian', 'hp']),
  F('casein', 'Казеин', 'Casein', 'supp', 370, 78, 2, 5, 0, 300, 0.9, 900, 1300, ['vegetarian', 'hp']),
  F('creatine', 'Креатин моногидрат', 'Creatine monohydrate', 'supp', 0, 0, 0, 0, 0, 0, 0, 0, 0, ['gf', 'vegan', 'lf']),
  F('bcAA', 'BCAA', 'BCAA', 'supp', 120, 25, 0.5, 3, 0, 200, 0.5, 200, 300, ['vegetarian', 'hp']),
  F('pre-workout', 'Предтренировочный', 'Pre-workout', 'supp', 400, 60, 6, 30, 2, 700, 3, 500, 800, ['vegetarian', 'hp']),
  F('mass-gainer', 'Гейнер', 'Mass gainer', 'supp', 380, 22, 6, 62, 4, 350, 2, 400, 500, ['vegetarian']),
  F('electrolyte', 'Изотоник', 'Electrolyte drink', 'supp', 25, 0, 0, 6, 0, 250, 0.1, 40, 100, ['gf', 'vegan', 'lf']),
  F('protein-shake-mix', 'Протеиновый коктейль на воде', 'Protein shake (per serving)', 'supp', 55, 11, 1, 1.5, 0, 45, 0.2, 110, 150, ['vegetarian']),
];

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));
export const getFood = (id) => FOOD_BY_ID[id] || null;

/** Nutrition totals for a portion in grams */
export function foodMacros(food, grams) {
  const r = grams / 100;
  return {
    kcal: food.k * r,
    p: food.p * r,
    f: food.f * r,
    c: food.c * r,
    fib: food.fib * r,
    na: food.na * r,
    fe: food.fe * r,
    ca: food.ca * r,
    po: food.po * r,
  };
}

/** kcal from macros (Atwater general factors) */
export const kcalFromMacros = (p, f, c, fiber = 0) =>
  p * 4 + f * 9 + (c - fiber) * 4 + fiber * 2;
