# pixels 🎨

**pixels** is a modern photo editor with a nostalgic soul. Built with a "Neo-Brutalism / Retro Paint App" aesthetic, it combines powerful image editing capabilities with a fun, vintage interface.

![Project Screenshot](public/pixels-logo.png)

## ✨ Features

- **Retro Aesthetic**: A fully custom UI featuring a beige canvas (`#dab495`), bold black borders, solid drop shadows, and pixel-art iconography.
- **Image Editing**:
  - Essential adjustments: Brightness, Contrast, Saturation, Exposure.
  - Advanced filters: Vignette, Grain, Blur.
  - Geometry tools: Rotation, Straightening, Cropping.
- **AI Tools**: Integration for advanced features like Object Removal and Generative Fill (Backend configuration required).
- **Canvas Interaction**: deep zoom, pan, and compare original functionality.
- **Local Processing**: Fast, privacy-focused image processing using WebGL/Canvas API.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Custom CSS variables
- **State Management**: Zustand
- **Graphics/Canvas**: React Konva & Konva.js
- **Image Processing**: Browser-native Canvas API & WebGL

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/akshtsh/pixels.git
    cd pixels
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the app:**
    Navigate to [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal).

## 🎨 Customization

- **Themes**: The application uses CSS variables in `app/globals.css` and Tailwind configuration in `tailwind.config.ts`. You can easily swap the generic `#dab495` beige for any other retro palette.
- **Icons**: Pixel art icons are stored in `public/`.

## 📄 License

MIT License.
