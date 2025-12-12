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

---

# Guide to integrating Tauri into your Vite React app and automating the build of a Windows `.exe` using GitHub Actions.

### **Phase 1: Add Tauri to Your Vite App**

1.  **Install Tauri CLI**
    Open your project terminal and install the Tauri CLI as a dev dependency.

    ```bash
    npm install --save-dev @tauri-apps/cli @tauri-apps/api
    ```

2.  **Initialize Tauri**
    Run the init command to create the `src-tauri` Rust backend folder.

    ```bash
    npx tauri init
    ```

      * **App Name:** (Your choice)
      * **Window Title:** (Your choice)
      * **Where are your web assets?** Type `../dist`
      * **Url of your dev server?** Type `http://localhost:5173`
      * **Frontend dev command?** Type `npm run dev`
      * **Frontend build command?** Type `npm run build`

3.  **Verify Configuration**
    Open `src-tauri/tauri.conf.json` and ensure the `build` section looks like this:

    ```json
    "build": {
      "beforeDevCommand": "npm run dev",
      "beforeBuildCommand": "npm run build",
      "devUrl": "http://localhost:5173",
      "frontendDist": "../dist"
    }
    ```

    *Note: If you are on Tauri v1, `frontendDist` is called `distDir` and `devUrl` is `devPath`.*

4.  **Test Locally**
    Run this command to start the app in a desktop window:

    ```bash
    npx tauri dev
    ```

-----

### **Phase 2: Automate Releases with GitHub Actions**

This workflow will run whenever you push a tag (like `v1.0.0`). It will build the app and upload the `.exe` to a new GitHub Release.

1.  **Create the Workflow File**
    Create the following directory and file in your project:
    `.github/workflows/release.yml`

2.  **Paste the Workflow Code**
    Add the following code to `release.yml`. This uses the official `tauri-action`.

    ```yaml
    name: Release App

    on:
      push:
        tags:
          - 'v*' # Triggers when you push a tag starting with v (e.g. v1.0.0)

    jobs:
      create-release:
        permissions:
          contents: write
        strategy:
          fail-fast: false
          matrix:
            platform: [windows-latest] # Add 'macos-latest' or 'ubuntu-latest' for other builds

        runs-on: ${{ matrix.platform }}

        steps:
          - name: Checkout repository
            uses: actions/checkout@v4

          - name: Install Rust
            uses: dtolnay/rust-toolchain@stable

          - name: Rust cache
            uses: swatinem/rust-cache@v2
            with:
              workspaces: './src-tauri -> target'

          - name: Sync node version and setup cache
            uses: actions/setup-node@v4
            with:
              node-version: 'lts/*'
              cache: 'npm'

          - name: Install frontend dependencies
            run: npm install

          - name: Build the app
            uses: tauri-apps/tauri-action@v0
            env:
              GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            with:
              tagName: ${{ github.ref_name }}
              releaseName: 'App v__VERSION__'
              releaseBody: 'See the assets to download this version and install.'
              releaseDraft: true
              prerelease: false
    ```

-----

### **Phase 3: How to Trigger a Release**

Now you can generate your `.exe` simply by using Git tags.

1.  **Update Version Numbers**
    Ensure the version in `package.json` and `src-tauri/tauri.conf.json` matches the release you are planning (e.g., `"0.1.0"`).

2.  **Push the Tag**
    Run these commands in your terminal:

    ```bash
    git add .
    git commit -m "chore: release v0.1.0"
    git push

    # Create and push the tag
    git tag v0.1.0
    git push origin v0.1.0
    ```

3.  **Download Your App**

      * Go to your GitHub repository and click the **"Actions"** tab.
      * Watch the "Release App" workflow run (it usually takes 10–15 minutes).
      * Once complete, go to the **"Releases"** tab on the main repo page.
      * You will see a "Draft" release containing your `setup.exe` and `.msi` files.

### **Troubleshooting Tips**

  * **Workflow Permissions:** If the Action fails with "Resource not accessible", go to your repo **Settings \> Actions \> General**, scroll to **Workflow permissions**, and select **"Read and write permissions"**.
  * **Bundle Identifier:** If the build fails, verify that `identifier` in `tauri.conf.json` is unique (e.g., `"com.myname.myapp"`).

---

# ### App Icons

Tauri ships with a default iconset based on its logo. This is NOT what you want when you ship your application. To remedy this common situation, Tauri provides the `icon` command that will take an input file (`./app-icon.png` by default) and create all the icons needed for the various platforms.

**NPM Command:**
```bash
npm run tauri icon
```

ref: https://v2.tauri.app/develop/icons/

```
> pnpm tauri icon --help

Generate various icons for all major platforms

Usage: pnpm run tauri icon [OPTIONS] [INPUT]

Arguments:
  [INPUT]  Path to the source icon (squared PNG or SVG file with transparency) [default: ./app-icon.png]

Options:
  -o, --output <OUTPUT>        Output directory. Default: 'icons' directory next to the tauri.conf.json file
  -v, --verbose...             Enables verbose logging
  -p, --png <PNG>              Custom PNG icon sizes to generate. When set, the default icons are not generated
      --ios-color <IOS_COLOR>  The background color of the iOS icon - string as defined in the W3C's CSS Color Module Level 4 <https://www.w3.org/TR/css-color-4/> [default: #fff]
  -h, --help                   Print help
  -V, --version                Print version
```

The desktop icons will be placed in your src-tauri/icons folder by default, where they will be included in your built app automatically. If you want to source your icons from a different location, you can edit this part of the tauri.conf.json file:

```json
{
  "bundle": {
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

The mobile icons will be placed into the Xcode and Android Studio projects directly!