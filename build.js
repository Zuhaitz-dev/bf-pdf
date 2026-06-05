const { PDFDocument, StandardFonts, rgb, PDFName, PDFString, PDFBool } = require('pdf-lib');
const fs = require('fs');

async function compilePolishedPdf() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([800, 600]);
    const form = pdfDoc.getForm();
    
    form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);

    page.drawRectangle({ x: 0, y: 0, width: 800, height: 600, color: rgb(1, 1, 1) });
    page.drawText('BRAINFUCK PDF COMPILER', { x: 40, y: 540, size: 22, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText("Created in 1993 by Urban Müller, Brainfuck operates on an array of memory cells using 8 simple commands.", { 
        x: 460, y: 520, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4), maxWidth: 300, lineHeight: 14 
    });

    page.drawText('COMMAND CHEATSHEET', { x: 460, y: 440, size: 12, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
    const cheatsheet = [
        { cmd: ">", desc: "Move pointer to the right" }, { cmd: "<", desc: "Move pointer to the left" },
        { cmd: "+", desc: "Increment the current cell" }, { cmd: "-", desc: "Decrement the current cell" },
        { cmd: ".", desc: "Output character at pointer" }, { cmd: ",", desc: "Input char (Reads from Stdin)" },
        { cmd: "[", desc: "Jump forward if cell is 0" }, { cmd: "]", desc: "Jump back if cell is not 0" }
    ];
    
    page.drawRectangle({
        x: 460, y: 425 - (8 * 25), width: 300, height: 8 * 25,
        color: rgb(0.97, 0.97, 0.97), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1
    });

    let currentY = 425;
    for (let i = 0; i < cheatsheet.length; i++) {
        page.drawText(cheatsheet[i].cmd, { x: 475, y: currentY - 17, size: 14, font: courier, color: rgb(0.1, 0.4, 0.8) });
        page.drawLine({ start: { x: 500, y: currentY }, end: { x: 500, y: currentY - 25 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        page.drawText(cheatsheet[i].desc, { x: 510, y: currentY - 15, size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) });
        if (i < cheatsheet.length - 1) page.drawLine({ start: { x: 460, y: currentY - 25 }, end: { x: 760, y: currentY - 25 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        currentY -= 25;
    }

    function addHyperlink(x, y, text, uri, fontSize) {
        page.drawText(text, { x, y, size: fontSize, font: helveticaBold, color: rgb(0, 0.4, 0.8) });
        const width = helveticaBold.widthOfTextAtSize(text, fontSize);
        const linkObj = pdfDoc.context.obj({
            Type: 'Annot', Subtype: 'Link', Rect: [x, y - 2, x + width, y + fontSize], Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) }
        });
        if (!page.node.get(PDFName.of('Annots'))) page.node.set(PDFName.of('Annots'), pdfDoc.context.newArray());
        page.node.get(PDFName.of('Annots')).push(pdfDoc.context.register(linkObj));
    }
    addHyperlink(460, 180, "Learn more at brainfuck.org", "https://brainfuck.org/", 11);
    page.drawText("Built by", { x: 460, y: 50, size: 11, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
    addHyperlink(505, 50, "Zuhaitz-dev", "https://github.com/Zuhaitz-dev", 11);

    page.drawText('Code Editor:', { x: 40, y: 525, size: 10, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('Standard Input (Stdin):', { x: 40, y: 325, size: 10, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('Console Output:', { x: 40, y: 255, size: 10, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });

    const codeField = form.createTextField('CodeInput');
    codeField.addToPage(page, { x: 40, y: 345, width: 380, height: 175 });
    codeField.enableMultiline();
    codeField.setFontSize(14);
    codeField.setText(">>+<--[[<++>->-->+++>+<<<]-->++++]<<.<<-.<<..+++.>.<<-.>.+++.------.>>-.<+.>>."); 
    codeField.updateAppearances(courier);

    const stdinField = form.createTextField('DataInput');
    stdinField.addToPage(page, { x: 40, y: 275, width: 380, height: 45 });
    stdinField.enableMultiline();
    stdinField.setFontSize(12);
    stdinField.setText("");
    stdinField.updateAppearances(courier);

    const outField = form.createTextField('OutputField');
    outField.addToPage(page, { x: 40, y: 40, width: 380, height: 210 });
    outField.enableMultiline(); 
    outField.enableReadOnly();
    outField.setFontSize(11);
    outField.setText("Loading Engine..."); 
    outField.updateAppearances(courier);

    const globalEngineJS = `
        function interpretBF(code, stdinStr) {
            var tape = [];
            for(var t=0; t<3000; t++) tape.push(0);
            
            var ptr = 0;
            var output = "";
            var pc = 0;
            var jumpMap = {};
            var stack = [];
            var stdinPtr = 0;
            
            for (var i = 0; i < code.length; i++) {
                if (code.charAt(i) === '[') stack.push(i);
                else if (code.charAt(i) === ']') {
                    var start = stack.pop();
                    jumpMap[start] = i; 
                    jumpMap[i] = start;
                }
            }
            
            var ops = 0;
            while (pc < code.length) {
                var cmd = code.charAt(pc);
                if (cmd === '>') ptr++;
                else if (cmd === '<') ptr--;
                else if (cmd === '+') tape[ptr] = (tape[ptr] + 1) % 256;
                else if (cmd === '-') tape[ptr] = (tape[ptr] - 1 + 256) % 256;
                else if (cmd === '.') output += String.fromCharCode(tape[ptr]);
                else if (cmd === ',') {
                    if (stdinPtr < stdinStr.length) {
                        tape[ptr] = stdinStr.charCodeAt(stdinPtr) % 256;
                        stdinPtr++;
                    } else {
                        tape[ptr] = 0;
                    }
                }
                else if (cmd === '[') { if (tape[ptr] === 0) pc = jumpMap[pc]; }
                else if (cmd === ']') { if (tape[ptr] !== 0) pc = jumpMap[pc]; }
                pc++;
                
                ops++;
                if (ops > 1000000) { output += "\\n[Timeout Safety Triggered]"; break; }
            }
            
            var memStr = "";
            for(var k=0; k<10; k++) { memStr += tape[k] + (k<9 ? ", " : ""); }
            return "Output: " + output + "\\nMemory Tape (first 10): " + memStr;
        }

        try {
            var bootOut = this.getField("OutputField");
            var bootIn = this.getField("CodeInput");
            var bootData = this.getField("DataInput");
            if (bootOut && bootIn) {
                var cVal = bootIn.value;
                var dVal = bootData ? bootData.value : "";
                if (cVal) {
                    bootOut.value = interpretBF(cVal, dVal);
                }
            }
        } catch(e) {}
    `;
    
    pdfDoc.addJavaScript('BFEngine', globalEngineJS);

    const liveKeystrokeJS = `
        try {
            var outObj = this.getField("OutputField");
            var isCode = (event.target.name === "CodeInput");
            
            var codeStr = "";
            if (isCode) {
                codeStr = event.willCommit ? event.value : event.target.value + event.change;
            } else {
                var cField = this.getField("CodeInput");
                codeStr = cField ? cField.value : "";
            }
            
            var stdinStr = "";
            if (!isCode) {
                stdinStr = event.willCommit ? event.value : event.target.value + event.change;
            } else {
                var dField = this.getField("DataInput");
                stdinStr = dField ? dField.value : "";
            }
            
            if (outObj) {
                if (codeStr && codeStr.trim() !== "") {
                    outObj.value = interpretBF(codeStr, stdinStr);
                } else {
                    outObj.value = "Waiting for input...";
                }
            }
        } catch(e) {
            var errObj = this.getField("OutputField");
            if (errObj) errObj.value = "Engine Error: " + e.message;
        }
    `;

    const keystrokeAction = pdfDoc.context.obj({
        Type: 'Action',
        S: 'JavaScript',
        JS: PDFString.of(liveKeystrokeJS)
    });

    const kObj = pdfDoc.context.obj({ K: keystrokeAction });
    
    codeField.acroField.getWidgets()[0].dict.set(PDFName.of('AA'), kObj);
    stdinField.acroField.getWidgets()[0].dict.set(PDFName.of('AA'), kObj);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('brainfuck_ide.pdf', pdfBytes);
    console.log("Success! Compiled the Ultimate Brainfuck PDF IDE with Hello World loaded.");
}

compilePolishedPdf().catch(console.error);
