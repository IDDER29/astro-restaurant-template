# Image Placeholders & Attribution

## Current Status

All menu item images are currently rendered as **gradient placeholders** for the demo. This allows the site to display beautifully without requiring real food photography during development.

## Adding Real Photos

To add a real photo to a menu item:

1. **Place the image file** in this directory (`public/images/`). Supported formats: `.jpg`, `.png`, `.webp`.
   
   Example: `public/images/chicken-tacos.jpg`

2. **Add the image path** to the menu item in `src/data/menu.json`:
   
   ```json
   {
     "id": "ctacos",
     "name": "Chicken Tacos",
     "desc": "chicken · fries · cheese sauce",
     "price": 35,
     "category": "tacos",
     "popular": true,
     "image": "/images/chicken-tacos.jpg"
   }
   ```

3. The `MenuCard.astro` component will automatically detect the `image` field and render the photo instead of the gradient placeholder.

## Using the Owner Dashboard

When the site goes live, the owner dashboard may provide an image upload UI that automatically writes the `image` field to `menu.json`. Use that instead of manual file placement if available.

## Attribution & Licensing

Add any stock photo attribution or license information below:

- (Currently using gradient placeholders only)

---

**Note:** All images used must be properly licensed and attributed. Include the license type (CC-BY, CC0, etc.) and the photographer/source name.
