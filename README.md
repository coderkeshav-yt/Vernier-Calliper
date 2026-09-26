# Vernier Caliper Virtual Laboratory 🔬📏

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0284c7?style=for-the-badge&logo=github)](https://coderkeshav-yt.github.io/Vernier-Calliper/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Pure Vanilla](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JavaScript-f59e0b?style=for-the-badge)](https://developer.mozilla.org/)

An interactive, high-precision physics simulation of a standard laboratory-grade **Vernier Caliper** (0–150 mm). Built from scratch using pure SVG graphics, Vanilla CSS, and JavaScript with zero external dependencies.

Designed for students, teachers, and engineering enthusiasts to master precision metrology, least count derivation, zero error corrections, and volumetric calculations.

---

## 🌐 Live Interactive Demo

Try the full laboratory simulation directly in your browser:  
👉 **[https://coderkeshav-yt.github.io/Vernier-Calliper/](https://coderkeshav-yt.github.io/Vernier-Calliper/)**

---

## ✨ Features & Highlights

### 1. ⚙️ High-Precision SVG Mechanical Caliper
- **Physics-Accurate Geometry**: Stainless-steel satin finish, hollow slider carriage window, sliding depth gauge rod, knurled brass locking screw, and ergonomic thumb grip.
- **Interactive Drag & Nudge Controls**: Smooth mouse dragging, touch support on mobile/tablets, fine-tuning buttons (`±10mm`, `±1mm`, `±LC`), direct numeric input, and range sliders.
- **Keyboard Shortcuts**: Use `←` / `→` arrow keys to nudge by 1 Least Count, `Shift + Arrow` to step by 1.0 mm, and `Home` to reset to zero.
- **Realistic Haptic Audio Feedback**: Synthesized clicks via Web Audio API that vary pitch as jaws slide and snap into place.

### 2. 🔍 5× Optical Coincidence Loupe
- Live magnified inspection glass displaying both main scale and Vernier scale markings.
- Center alignment crosshair that highlights the exact coincident Vernier division in green.
- Toggleable laser alignment guide line on the physical caliper.

### 3. 🎯 Selectable Least Count (LC) & Zero Error
- **Least Count Presets**:
  - `0.10 mm` (10 Vernier Divisions = 9 mm on Main Scale)
  - `0.05 mm` (20 Vernier Divisions = 19 mm on Main Scale — *Standard Lab Caliper*)
  - `0.02 mm` (50 Vernier Divisions = 49 mm on Main Scale — *High Precision*)
- **Zero Error Calibration**:
  - `0.00 mm` (Nil Error)
  - `+0.06 mm` (Positive Zero Error & Correction)
  - `-0.04 mm` (Negative Zero Error & Correction)

### 4. 🧰 Physics Specimen Catalog & Custom Specimen Studio
- **Standard Physics Specimens**:
  - **Brass Cylinder**: Measure outer diameter ($OD$) and cylinder length ($L$).
  - **Hollow Metal Pipe**: Measure inner bore ($ID$), outer diameter ($OD$), and length ($L$).
  - **Glass Beaker / Tube**: Measure internal bore ($ID$), outer rim ($OD$), and internal fluid depth ($H$).
  - **Precision Ring Gauge**: Measure internal diameter ($ID$) and outer boundary ($OD$).
  - **Steel Sphere**: Measure spherical ball diameter ($D$).
  - **Steel Hex Nut**: Measure across-flats width ($OD$) and internal threaded hole ($ID$).
  - **Stepped Well Block**: Measure cavity depth ($H$) with extending depth rod blade.
  - **Mystery Blind Sample**: Measure unknown object and derive its dimensions!
- **Custom Specimen Studio**:
  - Fully customize **Length ($L$)**, **Outer Diameter ($OD$)**, **Inner Bore ($ID$)**, and **Cavity Depth ($H$)**.
  - Choose geometries: *Solid Cylinder / Bar*, *Hollow Pipe*, *Solid Block*, *Sphere*, and *Stepped Well*.
  - Real-time dimension sliders, direct precision inputs, and quick 1-click dimension presets.
  - **Auto-Clamp Jaws**: Automatically animates and snaps caliper jaws to clamp the selected specimen dimension.

### 5. 🧪 Metrology & Volumetric Physics Lab
- Compute **wall thickness ($t$)**, **cross-sectional area ($A$)**, **material volume ($V_{mat}$)**, **internal fluid capacity ($V_{in}$)**, and **specimen mass ($M$)**.
- Built-in material density library: Steel ($7.85\text{ g/cm}^3$), Brass ($8.50\text{ g/cm}^3$), Aluminium ($2.70\text{ g/cm}^3$), Copper ($8.96\text{ g/cm}^3$), and Glass ($2.50\text{ g/cm}^3$).
- One-click `📥 Caliper` buttons to paste current readings directly into calculation formulas.

### 6. 🎓 Interactive Practice Quiz
- Generates randomized caliper readings with hidden readouts.
- Submit Main Scale Reading ($MSR$), Vernier Division ($VSR$), and Total Calculated Value.
- Immediate step-by-step mathematical feedback, scoring system, and streak tracker.

---

## 📐 Mathematical Metrology Formulas

### 1. Least Count (LC)
$$\text{Least Count} = 1\text{ MSD} - 1\text{ VSD} = \frac{1\text{ MSD}}{n}$$
Where:
- $1\text{ MSD} = 1.0\text{ mm}$ (Main Scale Division)
- $n =$ Number of divisions on Vernier scale ($10$, $20$, or $50$)

### 2. Observed Total Reading
$$\text{Observed Reading} = \text{MSR} + (\text{VSR} \times \text{LC})$$

### 3. Zero Error Correction
$$\text{Corrected Reading} = \text{Observed Reading} - (\pm\text{Zero Error})$$

### 4. Volumetric Equations
- **Hollow Pipe Wall Thickness**: $t = \frac{OD - ID}{2}$
- **Hollow Pipe Material Volume**: $V = \frac{\pi (OD^2 - ID^2) L}{4}$
- **Internal Fluid Capacity**: $V_{\text{fluid}} = \frac{\pi (ID^2) L}{4}$
- **Solid Cylinder Volume**: $V = \frac{\pi D^2 L}{4}$
- **Sphere Volume**: $V = \frac{\pi D^3}{6}$
- **Mass Calculation**: $\text{Mass} = \text{Volume} \times \text{Density}$

---

## 💻 Tech Stack

- **Markup & Structure**: Semantic HTML5 with accessible SVG components
- **Styling**: Vanilla CSS3 (Custom Properties, Flexbox, Grid, Glassmorphism, Responsive Media Queries)
- **Scripting & Engine**: Pure JavaScript (ES6+, Web Audio API, SVG DOM manipulation)
- **Typography**: Google Fonts (*Plus Jakarta Sans* & *JetBrains Mono*)
- **Dependencies**: None (Zero npm packages, zero external CDNs required)

---

## 🚀 Running Locally

No installation or build process is required. Simply clone the repository and open `index.html`:

```bash
# 1. Clone the repository
git clone https://github.com/coderkeshav-yt/Vernier-Calliper.git

# 2. Navigate to project directory
cd Vernier-Calliper

# 3. Open in browser (Windows)
start index.html

# Or open with VS Code Live Server / Python static server:
# python -m http.server 8000
```

---

## 📁 Repository Structure

```
Vernier_Calliper/
├── index.html       # Main HTML application structure, SVG caliper markup & dialogs
├── style.css        # Complete styling, animations, responsive design system
├── script.js       # Metrology simulation engine, SVG renderer, quiz & calculation logic
├── favicon.svg      # Precision caliper SVG favicon
└── README.md        # Documentation and project overview
```

---

## 👨‍💻 Author & Credits

Crafted with ❤️ by **Keshav Singh**  
- **GitHub**: [@coderkeshav-yt](https://github.com/coderkeshav-yt)  
- **Repository**: [https://github.com/coderkeshav-yt/Vernier-Calliper.git](https://github.com/coderkeshav-yt/Vernier-Calliper.git)  
- **Live Website**: [https://coderkeshav-yt.github.io/Vernier-Calliper/](https://coderkeshav-yt.github.io/Vernier-Calliper/)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE). Feel free to use, modify, and distribute for academic, educational, and commercial purposes.
