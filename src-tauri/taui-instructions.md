Here’s the **clean, practical guide** to packaging your **Vite + React** app using **Tauri**, with the exact steps and commands you need.

---

# ✅ How to Package a Vite + React App with Tauri

Tauri works by embedding your frontend (Vite/React) and serving it inside a lightweight Rust-based desktop shell.
The process has **three parts**:

1. **Install Tauri prerequisites**
2. **Add Tauri to your Vite React project**
3. **Build your production desktop app**

---

# 1️⃣ **Prerequisites**

### System dependencies (required by Tauri)

**Windows**

```bash
# Required
- Install Rust: https://rustup.rs
- Install Visual Studio Build Tools with “Desktop development with C++”
- Install WebView2 runtime
```

**macOS**

```bash
# Required
brew install rust
xcode-select --install
```

**Linux**
(installs vary: Rust, libgtk, webkit2gtk)

---

# 2️⃣ **Create or use your Vite React project**

If you already have one, skip this.

```bash
npm create vite@latest my-app --template react
cd my-app
npm install
```

---

# 3️⃣ **Add Tauri to the project**

Tauri provides a CLI that scaffolds the backend and config.

### Install Tauri CLI & helpers

```bash
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api
```

### Initialize Tauri inside your Vite React project

```bash
npx tauri init
```

During setup it will ask:

* **Where is your front-end dev command?**
  → `npm run dev`

* **Where is your front-end build command?**
  → `npm run build`

* **Dist folder (build output)?**
  → `dist`

* **Dev server URL?**
  → `http://localhost:5173`

This generates a `src-tauri` folder containing:

* `tauri.conf.json`
* Rust backend in `src-tauri/src/main.rs`

This now makes your Vite app a Tauri desktop app.

---

# 4️⃣ **Run Tauri in development mode**

```bash
npm run tauri dev
```

This launches your React app inside a Tauri window with hot reload.

---

# 5️⃣ **Build your desktop app**

When ready for packaging (installer/executable):

```bash
npm run build
npm run tauri build
```

Tauri outputs installers/executables in:

```
src-tauri/target/release/bundle/
```

You’ll get:

* `.exe` / `.msi` (Windows)
* `.app` / `.dmg` (Mac)
* `.AppImage` / `.deb` (Linux)

---

# 6️⃣ Optional tweaks

### Change window size or title

Edit: `src-tauri/tauri.conf.json`

Example:

```json
{
  "tauri": {
    "windows": [
      {
        "label": "main",
        "title": "My React App",
        "width": 1000,
        "height": 700
      }
    ]
  }
}
```

### Secure API calls from frontend

Use:

```ts
import { invoke } from '@tauri-apps/api/tauri';

invoke("my_rust_function", { arg: 123 })
```

---

# 🎉 You're done!

You now have a Vite React app fully wrapped and packaged as a Tauri desktop application.

---

If you'd like, I can also help you:

✅ set up auto-updates
✅ access native filesystem APIs
✅ call Rust functions from React
✅ reduce bundle size
✅ create installers for different OSes

Just tell me what you need!


---

This error means your project **does not have a `"tauri"` script defined in package.json**.
It usually happens when:

### ✔️ You installed the Tauri CLI **but did NOT run `tauri init`**

or

### ✔️ You ran `tauri init` in the wrong folder

or

### ✔️ Your frontend project isn’t yet configured as a Tauri app

Let’s fix it step by step.

---

# ✅ **1. Check if you have a `src-tauri` folder**

Go to your project folder and run:

```bash
dir
```

You should see:

```
src-tauri/
```

If not → Tauri is **not initialized** → go to step 3.

---

# ✅ **2. Check if Tauri CLI installed**

Run:

```bash
npx tauri --version
```

If you get a version → CLI installed
If not → install it:

```bash
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api
```

---

# ✅ **3. Initialize Tauri (MOST LIKELY FIX)**

Run this **inside your Vite project folder**:

```bash
npx tauri init
```

This creates the missing:

* `src-tauri/`
* `tauri.conf.json`
* Rust backend
* package.json scripts

---

# ✅ **4. After `tauri init`, check package.json**

Open `package.json` and confirm you have:

```json
"scripts": {
  "tauri": "tauri"
}
```

If not, you can add it manually:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "tauri": "tauri"
  }
}
```

---

# ✅ **5. Now your commands should work**

For dev mode:

```bash
npm run tauri dev
```

For building installers:

```bash
npm run tauri build
```

---

# ❗ If you STILL see the error

It means you installed CLI globally but didn’t initialize the project.

Please run this:

```bash
npx tauri init
```

and then:

```bash
npm run tauri dev
```

---

If you want, you can paste your **package.json** or the output of `dir` and I’ll diagnose it instantly.
