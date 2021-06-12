/*
 * Copyright (c) 2021 Bruno Verchère
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

let md = null, rx = null;

/**
 * Class containing the regular expressions and operations.
 */
class Regex {
    constructor(){
        this.all = {
            'fileExt': /\.[^.\\/:*?\"<>|\r\n]+$/gm,
            'title': /(#{1,10})\ .+/gm,
            'ul': /^(-|\*)\ .+$/gm,
            'pre': /```([a-zA-Z0-9]+)?\r?\n((.+\r?\n)+)```/gm,
            'img': /!\[([a-zA-Z0-9Ü-ü\ -_]+)\]\(([a-zA-Z0-9Ü-ü\ -_/]+)\)/gm
        };
        this.text = [
            {
                val: /`([^`]+)`/g,
                sub: '<code>$1</code>',
                name: 'Simple code sample'
            },
            {
                val: /\[([a-zA-Z0-9\ -_:]+)\]\((https?:\/\/[a-zA-Z0-9\.\/:]+)\)/g,
                sub: '<a href="$2">$1</a>',
                name: 'External link'
            },
            {
                val: /[^">/](https?:\/\/[a-zA-Z0-9\.\/:]+)/gm,
                sub: '<a href="$1">$1</a>',
                name: 'Simple link'
            },
            {
                val: /([a-z0-9]+([_|\.|-]{1}[a-z0-9]+)*@[a-z0-9]+([_|\.|-]­{1}[a-z0-9]+)*[\.]{1}[a-z]{2,6})/g,
                sub: '<a href="$1">$1</a>',
                name: 'Email address'
            },
            {
                val: /([0-9]+(\.{1}[0-9]+)?[^\.0-9\/:\]\)"<])/gm,
                sub: '<span class="cyan-text">$1</span>',
                name: 'Number'
            },
            {
                val: /\*{2}([a-zA-Z0-9Ü-ü\ \._\-\\\/#:%+=$~€\(\)<>]+)\*{2}/gm,
                sub: '<strong>$1</strong>',
                name: 'Boldness 1'
            },
            {
                val: /_{2}([a-zA-Z0-9Ü-ü\ \._\-\\\/#%:+=$~€\(\)<>]+)_{2}/gm,
                sub: '<strong>$1</strong>',
                name: 'Boldness 2'
            },
            {
                val: /\*([a-zA-Z0-9Ü-ü\ \._\-\\\/#%+=$:~€\(\)<>]+)\*/gm,
                sub: '<i>$1</i>',
                name: 'Italic 1'
            },
            {
                val: /_([a-zA-Z0-9Ü-ü\ \._\-\\\/#%+=$:~€\(\)<>]+)_/gm,
                sub: '<i>$1</i>',
                name: 'Italic 2'
            }
        ];
    }

    match(str, rxName){
        return str.match(this.all[rxName]);
    }

    exec(str, rxName){
        return this.all[rxName].exec(str);
    }
    
};

/**
 * Class representing a markdown file parser.
 * 
 * @param {Object} file - The input file
 */
class MdContent {

    constructor(file){
        this.reader = new FileReader();
        this.raw = '';
        this.interpreted = [];
        this.reader.onload = (ev) => {
            this.rootFolder = file.path.split(file.name)[0];
            this.raw = ev.target.result;
            this.eol = this.raw.match(/\r/) ? '\r\n' : '\n';
            this.makePretty();
            content.innerHTML = this.getPretty();
        }
        this.reader.readAsText(file);
        this.parsers = [
            this.isCodeBlock.bind(this),
            this.isTitle.bind(this),
            this.isUl.bind(this),
            this.isImage.bind(this),
            this.textualRegex.bind(this)
        ]
    }

    /**
     * Tell if the reader finish its job successfully.
     * @returns Wether the reading has ended or not
     */
    isReady(){ return this.reader.readyState == 2; }

    /**
     * Get the raw file content.
     * 
     * @returns The file content as a pre DOM element.
     */
    getRaw() {
        const pre = document.createElement('pre');
        pre.id = 'rawMarkdown';
        pre.className = 'code';
        pre.innerText = this.raw;
        return pre;
    }

    /**
     * Get the pretty version of the file content.
     * 
     * @returns The pretty version as a string
     */
    getPretty(){ return this.interpreted.filter(item => item != null).join('\n\n'); }

    /**
     * Apply the textual regex on the element.
     * 
     * @param {str} element - The text element
     * @returns The element with replaced patterns
     */
    textualRegex(element){
        let result = element;
        rx.text.forEach(rg => {
            result = result.replace(rg.val, rg.sub);
        });
        return result;
    }

    /**
     * Interpret the input file to make it stylish. 
     */
    makePretty() {
        this.raw.split(this.eol+this.eol).forEach(element => {
            let html = null;let i = 0;
            do {
                html = this.parsers[i](element); i++;
            }while(html == null && i < this.parsers.length);
            this.interpreted.push(html);
        });
    }

    isTitle(element){
        if (rx.match(element, 'title')){
            let matches = rx.exec(element, 'title');
            const level = matches[1].length;
            let tag = document.createElement(`h${level}`);
            tag.innerHTML = `${matches[0].split(matches[1]+' ')[1].replace(/`<(.+)>`/, '&lt;$1&gt')}`;
            return tag.outerHTML;
        }
        return null;
    }

    isUl(element){
        const regex = rx.all['ul'];
        let m; let matches = [];
        while((m = rx.exec(element, 'ul')) != null){
            if(m.index === matches.lastIndex){ regex.lastIndex++; }
            matches.push(m);
        }
        if(matches.length > 0){
            let ul = document.createElement('ul');
            matches.forEach(m => {
                let item = document.createElement('li');
                item.innerHTML = this.textualRegex(m[0].substr(2));
                ul.appendChild(item);
            })
            return ul.outerHTML;
        }
        return null;
    }

    isCodeBlock(element){
        let matches = rx.exec(element, 'pre');
        if (matches != null){
            let block = document.createElement('div');
            block.className = 'code pretty';
            block.innerHTML =  blockBuilder(matches[2], matches[1]).content;
            return block.outerHTML;
        }
        return null;
    }

    isImage(element){
        if (rx.match(element, 'img')){
            let matches = rx.exec(element, 'img');
            let img = document.createElement(`img`);
            img.alt = matches[1];
            img.className = 'center';
            if (matches[2].match(/^\/.+$/)){ img.src = matches[2]; }
            else{ img.src = this.rootFolder + matches[2].substr(1); }
            return img.outerHTML;
        }
        return null;
    }
};

/**
 * File drag and drop listeners.
 */
document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length == 1){
        const file = e.dataTransfer.files[0]; let ext;
        rx = new Regex();
        if ((ext = rx.match(file.name, 'fileExt')) != null && ext[0] === '.md'){
            md = new MdContent(file);
        }
    }
});
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});
/**
 * Raw/Interpreted switch listener
 */
document.querySelector('#raw').addEventListener('click', (e) => {
    const content = document.querySelector('#content');
    if (e.target.checked && md != null && md.isReady()){
        content.innerHTML = '';
        content.appendChild(md.getRaw());
    }else if (!e.target.checked && md != null && md.isReady()){
        const rawMd = document.querySelector('#rawMarkdown');
        content.removeChild(rawMd);
        content.innerHTML = md.getPretty();
    }
});
