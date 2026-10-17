/** Demo catalogue for the seed script. Prices are in rupees here; the seed converts to paise. */
type Dish = [name: string, category: string, rupees: number, type: 'VEG' | 'NON_VEG' | 'EGG', description: string];

export interface CuisineTemplate {
  tags: string[];
  pureVeg?: boolean;
  priceForTwo: [number, number];
  dishes: Dish[];
}

export const AREAS: { name: string; lat: number; lng: number }[] = [
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { name: 'HSR Layout', lat: 12.9116, lng: 77.6474 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.75 },
  { name: 'Jayanagar', lat: 12.925, lng: 77.5938 },
  { name: 'JP Nagar', lat: 12.9063, lng: 77.5857 },
  { name: 'BTM Layout', lat: 12.9166, lng: 77.6101 },
  { name: 'MG Road', lat: 12.9756, lng: 77.6066 },
  { name: 'Marathahalli', lat: 12.9569, lng: 77.7011 },
  { name: 'Malleshwaram', lat: 13.0035, lng: 77.571 },
  { name: 'Bellandur', lat: 12.9304, lng: 77.6784 },
  { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
];

export const NAME_FIRST = [
  'Spice', 'Dakshin', 'Royal', 'Urban', 'Namma', 'Tandoor', 'Saffron', 'Golden', 'Masala', 'Coastal',
  'Little', 'Green', 'Dragon', 'Desi', 'Mughal', 'Udupi', 'Malabar', 'Chai', 'Rasoi', 'Bombay',
  'Delhi', 'Hyderabad', 'Kaveri', 'Nilgiri', 'Tamarind', 'Curry', 'Clove', 'Pepper', 'Mango', 'Lotus',
];
export const NAME_SECOND = [
  'Kitchen', 'House', 'Junction', 'Express', 'Corner', 'Cafe', 'Bistro', 'Darbar', 'Mess', 'Tiffins',
  'Diner', 'Grill', 'Bowl', 'Point', 'Adda', 'Kitchens', 'Table', 'Eatery', 'Bhavan', 'Factory',
];

export const CUISINES: Record<string, CuisineTemplate> = {
  northIndian: {
    tags: ['North Indian', 'Mughlai'],
    priceForTwo: [400, 900],
    dishes: [
      ['Paneer Butter Masala', 'Main Course', 289, 'VEG', 'Cottage cheese in a rich tomato and butter gravy'],
      ['Dal Makhani', 'Main Course', 249, 'VEG', 'Black lentils slow-cooked overnight with cream and butter'],
      ['Butter Chicken', 'Main Course', 349, 'NON_VEG', 'Tandoori chicken simmered in a creamy tomato gravy'],
      ['Kadai Paneer', 'Main Course', 279, 'VEG', 'Paneer tossed with capsicum and freshly ground kadai masala'],
      ['Chicken Tikka', 'Starters', 299, 'NON_VEG', 'Boneless chicken marinated in yoghurt and spices, char-grilled'],
      ['Paneer Tikka', 'Starters', 269, 'VEG', 'Smoky tandoor-grilled paneer with mint chutney'],
      ['Butter Naan', 'Breads', 59, 'VEG', 'Soft leavened bread brushed with butter'],
      ['Garlic Naan', 'Breads', 69, 'VEG', 'Naan topped with roasted garlic and coriander'],
      ['Tandoori Roti', 'Breads', 35, 'VEG', 'Whole wheat bread baked in the tandoor'],
      ['Jeera Rice', 'Rice', 169, 'VEG', 'Basmati rice tempered with cumin'],
      ['Gulab Jamun', 'Desserts', 99, 'VEG', 'Two warm milk dumplings soaked in rose syrup'],
      ['Sweet Lassi', 'Beverages', 89, 'VEG', 'Chilled churned yoghurt drink'],
    ],
  },
  southIndian: {
    tags: ['South Indian', 'Udupi'],
    pureVeg: true,
    priceForTwo: [150, 350],
    dishes: [
      ['Masala Dosa', 'Dosa', 99, 'VEG', 'Crisp rice crepe with spiced potato filling, chutney and sambar'],
      ['Ghee Roast Dosa', 'Dosa', 129, 'VEG', 'Paper-thin dosa roasted in pure ghee'],
      ['Rava Dosa', 'Dosa', 109, 'VEG', 'Lacy semolina crepe with onions and green chilli'],
      ['Idli Sambar', 'Breakfast', 69, 'VEG', 'Two steamed rice cakes with sambar and coconut chutney'],
      ['Medu Vada', 'Breakfast', 79, 'VEG', 'Crisp lentil doughnuts with chutney'],
      ['Onion Uttapam', 'Dosa', 119, 'VEG', 'Thick rice pancake topped with onions'],
      ['Ven Pongal', 'Breakfast', 89, 'VEG', 'Rice and moong dal cooked with pepper, cumin and ghee'],
      ['Bisi Bele Bath', 'Rice', 119, 'VEG', 'Karnataka-style spicy rice and lentil one-pot meal'],
      ['Curd Rice', 'Rice', 89, 'VEG', 'Comforting yoghurt rice with a mustard tempering'],
      ['Kesari Bath', 'Desserts', 69, 'VEG', 'Semolina halwa with saffron and cashews'],
      ['Filter Coffee', 'Beverages', 45, 'VEG', 'Strong South Indian decoction coffee with frothy milk'],
    ],
  },
  biryani: {
    tags: ['Biryani', 'Hyderabadi'],
    priceForTwo: [350, 800],
    dishes: [
      ['Chicken Dum Biryani', 'Biryani', 299, 'NON_VEG', 'Hyderabadi dum biryani with tender chicken and saffron rice'],
      ['Mutton Biryani', 'Biryani', 399, 'NON_VEG', 'Slow-cooked mutton layered with fragrant basmati rice'],
      ['Veg Dum Biryani', 'Biryani', 229, 'VEG', 'Seasonal vegetables and basmati rice sealed and dum-cooked'],
      ['Egg Biryani', 'Biryani', 219, 'EGG', 'Boiled eggs tossed in masala, layered with biryani rice'],
      ['Paneer Biryani', 'Biryani', 259, 'VEG', 'Marinated paneer cubes with aromatic rice'],
      ['Chicken 65', 'Starters', 249, 'NON_VEG', 'Spicy deep-fried chicken with curry leaves'],
      ['Chicken Seekh Kebab', 'Starters', 279, 'NON_VEG', 'Minced chicken kebabs grilled on skewers'],
      ['Mirchi Ka Salan', 'Sides', 99, 'VEG', 'Green chillies in a tangy peanut and sesame gravy'],
      ['Burani Raita', 'Sides', 59, 'VEG', 'Yoghurt with roasted garlic'],
      ['Double Ka Meetha', 'Desserts', 119, 'VEG', 'Hyderabadi bread pudding with dry fruits'],
    ],
  },
  chinese: {
    tags: ['Chinese', 'Asian'],
    priceForTwo: [300, 700],
    dishes: [
      ['Veg Hakka Noodles', 'Noodles', 189, 'VEG', 'Wok-tossed noodles with crunchy vegetables'],
      ['Chicken Hakka Noodles', 'Noodles', 229, 'NON_VEG', 'Noodles stir-fried with chicken and spring onion'],
      ['Schezwan Fried Rice', 'Rice', 199, 'VEG', 'Fiery fried rice with house Schezwan sauce'],
      ['Egg Fried Rice', 'Rice', 189, 'EGG', 'Fried rice with scrambled egg and soy'],
      ['Veg Manchurian', 'Starters', 199, 'VEG', 'Vegetable dumplings in a spicy garlic sauce'],
      ['Chilli Chicken', 'Starters', 259, 'NON_VEG', 'Crispy chicken tossed with peppers and green chilli'],
      ['Chilli Paneer', 'Starters', 239, 'VEG', 'Paneer tossed with onions, capsicum and soy'],
      ['Veg Spring Rolls', 'Starters', 169, 'VEG', 'Crispy rolls stuffed with cabbage and carrot'],
      ['Hot and Sour Soup', 'Soups', 139, 'VEG', 'Peppery, tangy soup with vegetables'],
      ['Sweet Corn Soup', 'Soups', 129, 'VEG', 'Creamy corn soup'],
    ],
  },
  pizza: {
    tags: ['Pizza', 'Italian'],
    priceForTwo: [500, 1100],
    dishes: [
      ['Margherita Pizza', 'Pizzas', 299, 'VEG', 'Tomato sauce, mozzarella and fresh basil'],
      ['Farmhouse Pizza', 'Pizzas', 399, 'VEG', 'Onion, capsicum, tomato and mushroom'],
      ['Pepperoni Pizza', 'Pizzas', 499, 'NON_VEG', 'Spicy pepperoni with extra mozzarella'],
      ['Paneer Tikka Pizza', 'Pizzas', 429, 'VEG', 'Tandoori paneer, onions and mint mayo'],
      ['BBQ Chicken Pizza', 'Pizzas', 479, 'NON_VEG', 'Smoky barbecue chicken with red onion'],
      ['Cheesy Garlic Bread', 'Sides', 179, 'VEG', 'Baked garlic bread with melted cheese'],
      ['Penne Arrabbiata', 'Pasta', 329, 'VEG', 'Penne in a spicy tomato and garlic sauce'],
      ['Chicken Alfredo Pasta', 'Pasta', 379, 'NON_VEG', 'Fettuccine in a creamy parmesan sauce with chicken'],
      ['Choco Lava Cake', 'Desserts', 129, 'EGG', 'Warm chocolate cake with a molten centre'],
      ['Tiramisu', 'Desserts', 219, 'EGG', 'Coffee-soaked sponge with mascarpone cream'],
    ],
  },
  burgers: {
    tags: ['Burgers', 'Fast Food'],
    priceForTwo: [300, 600],
    dishes: [
      ['Classic Veg Burger', 'Burgers', 149, 'VEG', 'Crispy veg patty, lettuce and house mayo'],
      ['Crispy Chicken Burger', 'Burgers', 199, 'NON_VEG', 'Fried chicken fillet with spicy slaw'],
      ['Paneer Royale Burger', 'Burgers', 189, 'VEG', 'Grilled paneer with tandoori sauce'],
      ['Double Cheese Smash Burger', 'Burgers', 269, 'NON_VEG', 'Two smashed chicken patties and cheddar'],
      ['Salted French Fries', 'Sides', 99, 'VEG', 'Golden fries with sea salt'],
      ['Peri Peri Fries', 'Sides', 129, 'VEG', 'Fries dusted with peri peri spice'],
      ['Chicken Wings', 'Sides', 239, 'NON_VEG', 'Six wings tossed in hot sauce'],
      ['Cold Coffee', 'Beverages', 119, 'VEG', 'Blended iced coffee'],
      ['Chocolate Shake', 'Beverages', 149, 'VEG', 'Thick chocolate milkshake'],
    ],
  },
  desserts: {
    tags: ['Desserts', 'Ice Cream'],
    pureVeg: true,
    priceForTwo: [200, 450],
    dishes: [
      ['Rasmalai', 'Indian Sweets', 129, 'VEG', 'Soft cottage cheese discs in saffron milk'],
      ['Kulfi Falooda', 'Indian Sweets', 149, 'VEG', 'Malai kulfi with falooda noodles and rose syrup'],
      ['Gajar Halwa', 'Indian Sweets', 119, 'VEG', 'Slow-cooked carrot pudding with khoya'],
      ['Jalebi with Rabri', 'Indian Sweets', 139, 'VEG', 'Crisp jalebis served with thickened milk'],
      ['Chocolate Brownie', 'Bakes', 139, 'EGG', 'Fudgy walnut brownie'],
      ['Sizzling Brownie Sundae', 'Ice Cream', 229, 'EGG', 'Hot brownie with vanilla ice cream and chocolate sauce'],
      ['Belgian Chocolate Ice Cream', 'Ice Cream', 159, 'VEG', 'Two scoops of rich chocolate ice cream'],
      ['Mango Cheesecake', 'Bakes', 199, 'EGG', 'Baked cheesecake with Alphonso mango'],
    ],
  },
  healthy: {
    tags: ['Healthy', 'Salads'],
    priceForTwo: [450, 900],
    dishes: [
      ['Quinoa Power Bowl', 'Bowls', 329, 'VEG', 'Quinoa, chickpeas, roasted veggies and tahini'],
      ['Grilled Chicken Bowl', 'Bowls', 369, 'NON_VEG', 'Herb chicken with brown rice and greens'],
      ['Paneer Protein Salad', 'Salads', 289, 'VEG', 'Grilled paneer, sprouts and lemon dressing'],
      ['Greek Salad', 'Salads', 259, 'VEG', 'Cucumber, olives, feta and oregano'],
      ['Avocado Toast', 'Breakfast', 279, 'VEG', 'Sourdough with smashed avocado and chilli flakes'],
      ['Berry Smoothie Bowl', 'Breakfast', 249, 'VEG', 'Blended berries topped with granola and seeds'],
      ['Cold Pressed Orange Juice', 'Beverages', 149, 'VEG', 'Fresh oranges, nothing added'],
    ],
  },
  streetFood: {
    tags: ['Street Food', 'Chaat'],
    pureVeg: true,
    priceForTwo: [150, 300],
    dishes: [
      ['Pani Puri', 'Chaat', 69, 'VEG', 'Crisp puris with spicy mint water and potato filling'],
      ['Pav Bhaji', 'Mumbai Specials', 139, 'VEG', 'Buttery mashed vegetable curry with toasted pav'],
      ['Vada Pav', 'Mumbai Specials', 49, 'VEG', 'Spiced potato fritter in a soft bun with chutneys'],
      ['Bhel Puri', 'Chaat', 79, 'VEG', 'Puffed rice tossed with chutneys and sev'],
      ['Dahi Puri', 'Chaat', 89, 'VEG', 'Puris filled with yoghurt and sweet chutney'],
      ['Chole Bhature', 'Mains', 159, 'VEG', 'Spicy chickpea curry with fluffy fried bread'],
      ['Samosa (2 pcs)', 'Snacks', 49, 'VEG', 'Crisp pastry with spiced potato and peas'],
      ['Aloo Tikki Chaat', 'Chaat', 99, 'VEG', 'Potato patties with yoghurt and chutneys'],
    ],
  },
  coastal: {
    tags: ['Kerala', 'Seafood'],
    priceForTwo: [400, 850],
    dishes: [
      ['Appam with Veg Stew', 'Mains', 189, 'VEG', 'Lace-edged rice pancakes with coconut milk stew'],
      ['Kerala Parotta', 'Breads', 49, 'VEG', 'Flaky layered flatbread'],
      ['Meen Curry', 'Seafood', 329, 'NON_VEG', 'Kingfish in a tangy kodampuli coconut curry'],
      ['Prawn Masala', 'Seafood', 379, 'NON_VEG', 'Prawns cooked in a spicy onion-tomato masala'],
      ['Malabar Chicken Biryani', 'Biryani', 289, 'NON_VEG', 'Kaima rice biryani in the Thalassery style'],
      ['Chicken Ghee Roast', 'Mains', 319, 'NON_VEG', 'Mangalorean chicken roasted in ghee and byadgi chilli'],
      ['Neer Dosa', 'Breads', 89, 'VEG', 'Soft, thin rice crepes'],
      ['Tender Coconut Pudding', 'Desserts', 149, 'VEG', 'Silky pudding with tender coconut'],
    ],
  },
};
