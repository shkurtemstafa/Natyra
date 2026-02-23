# Kosovo Natural Products 🍯

A modern e-commerce website for natural honey and products from Kosovo. Features WhatsApp ordering, product reviews, wishlist, and a beautiful responsive design.

## 🌟 Features

- **Product Catalog**: Browse honey, natural oils, herbal teas, and more
- **WhatsApp Integration**: Direct ordering via WhatsApp
- **Shopping Cart**: Add products and manage quantities
- **Wishlist**: Save favorite products
- **Product Reviews**: Customer ratings and feedback
- **Responsive Design**: Works on all devices
- **Category Filtering**: Easy product discovery
- **Search Functionality**: Find products quickly

## 🚀 Live Demo

[View Live Site](#) *(Add your deployment URL here)*

## 📦 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: LocalStorage for cart, wishlist, and reviews
- **Deployment**: GitHub Pages / Netlify / Vercel

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR-USERNAME/kosovo-natural-products.git
cd kosovo-natural-products
```

2. Open `about.html` in your browser or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

3. Visit `http://localhost:8000`

## 📁 Project Structure

```
├── about.html              # About/Home page
├── products.html           # Product listing
├── product.html            # Product details
├── cart.html              # Shopping cart
├── wishlist.html          # Saved products
├── complete-order.html    # Checkout page
├── categories.html        # Category browser
├── contact.html           # Contact page
├── css/
│   └── styles.css         # Main stylesheet
├── js/
│   └── app.js            # Main JavaScript
├── data/
│   ├── products.js       # Product data
│   ├── seed_reviews.js   # Sample reviews
│   └── best_seller_popups.js
└── assets/               # Images and media
```

## 🎨 Customization

### Update Brand Information

Edit the `BRAND` object in `data/products.js`:

```javascript
const BRAND = {
  name: "Your Brand Name",
  tagline: "Your Tagline",
  whatsapp_phone: "+383 XX XXX XXX",
  currency: "€"
};
```

### Add Products

Add new products to the `PRODUCTS` array in `data/products.js`.

## 📱 WhatsApp Integration

Orders are sent directly to WhatsApp. Update the phone number in `data/products.js`:

```javascript
whatsapp_phone: "+383 49 123 456"
```

## 🌐 Deployment

### GitHub Pages
1. Push to GitHub
2. Go to Settings → Pages
3. Select `main` branch
4. Your site will be live at `https://username.github.io/repository-name/`

### Netlify
1. Connect your GitHub repository
2. Deploy automatically on every push

### Vercel
1. Import your GitHub repository
2. Deploy with one click

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

For questions or support, contact us via:
- WhatsApp: +383 49 123 456
- Email: info@naturalproducts.com

---

Made with ❤️ in Kosovo
