# Brainfuck PDF IDE

A fully functional, self-contained Brainfuck compiler, execution environment, and interactive IDE embedded entirely within a single PDF document.

Open the PDF, type code into the text box, and it compiles and runs live in your browser.

## Features

* Zero Dependencies: Once compiled, the PDF runs completely offline using the native JavaScript sandbox built into modern PDF viewers (optimized for Chromium/PDFium).
* Live Compilation: Evaluates Brainfuck loops and logic dynamically via Acrobat Keystroke (`/K`) and Blur (`/Bl`) Document Action hooks.
* Standard I/O: Fully supports the comma command via a dedicated Standard Input text field, and prints directly to a read-only console canvas.
* Un-brickable Engine: Bypasses modern PDF sandbox restrictions using a pure ES3-compliant JavaScript execution loop.
* High Headroom: Runs complex scripts instantly with a 10,000,000 operation limit to prevent timeouts.

## How to Build It

If you want to compile the PDF yourself from the source scripts:

1. Clone the repository:
```bash
    git clone https://github.com/Zuhaitz-dev/brainfuck-pdf-ide.git
    cd brainfuck-pdf-ide
```

2. Install the required PDF manipulation library:
```bash
    npm install
```

3. Run the build script:
```bash
    node build.js
```

4. Open the newly generated `brainfuck_ide.pdf` in Chromium or Google Chrome.

> Note: Chrome's PDF engine, PDFium, is highly recommended for the best interactive experience.

## How it Works Under the Hood

Modern PDF viewers contain a restricted, highly isolated JavaScript engine originally designed for calculating form fields. This project exploits that engine by:

1. Using pdf-lib to construct low-level AcroForm dictionaries (`/AA`, `/C`, `/O`).
2. Injecting a custom ES3 Brainfuck interpreter directly into the PDF's Global Namespace (`/Names`).
3. Hijacking the native Keystroke and Form Blur events to pass strings from custom PDF Annotation bounding boxes straight into the interpreter's memory tape.

## License

MIT License. Feel free to fork it, break it, and build weirder things inside PDFs. Pretty much, just have fun with it.
