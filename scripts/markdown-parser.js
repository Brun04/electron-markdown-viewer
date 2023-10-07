/*
 * Copyright (c) 2021-2023 Bruno Verchère
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

let md = null;

/**
 * List of non-dynamic regular expressions used in the app.
 */
const RegexConstants = {
    FILE_EXTENSION: /\.[^.\\/:*?\"<>|\r\n]+$/gm,
    CODE_BLOCK: /```(?<language>[0-9A-Za-zÂ-ÿ]+)?\r?\n(?<content>[^`]+)\r?\n```/gm,
    TITLE: /^(?<level>#{1,10})\ (?<content>.+)/gm,
    IMAGE: /!\[(?<alt>[a-zA-Z0-9Ü-ü\ -_]+)?\]\((?<src>[a-zA-Z0-9Ü-ü\ -_/]+)\)/gm,
    UNORDERED_LIST: /^(-|\*)\ (?<content>.+)$/gm,
    ORDERED_LIST: /^([0-9]+\.)\ (?<content>.+)$/gm,
};

const TextRegexConstants = [
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
        val: / (?<value>[0-9]+(\.[0-9]+)?)(?: |\. |, |)/gm,
        sub: ' <span class="cyan-text">$1</span>',
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

/**
 * Class representing a markdown file parser.
 * 
 * @param {Object} file - The input file
 */
class MdContent {

    constructor(file){
        this.reader = new FileReader();
        this.raw = '';
        this.pretty;
        this.reader.onload = (ev) => {
            this.rootFolder = file.path.split(file.name)[0];
            this.raw = ev.target.result;
            this.eol = this.raw.match(/\r/) ? '\r\n' : '\n';
            this.doubleEolRegex = this.raw.match(/\r/) ? /'\r\n\r\n'/gm : /'\n\n'/gm;
            this.makePretty();
        }
        this.reader.readAsText(file);
        this.parsers = [
            { method: this.parseCodeBlocks.bind(this), rx: RegexConstants.CODE_BLOCK },
            { method: this.parseTitles.bind(this), rx: RegexConstants.TITLE },
            { method: this.parseImages.bind(this), rx: RegexConstants.IMAGE },
        ];
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
    getPretty(){ 
        return this.pretty;
    }

    /**
     * Apply the textual regex on the element.
     * 
     * @param {str} element - The text element
     * @returns The element with replaced patterns
     */
    textualRegex(element){
        return TextRegexConstants.reduce((acc, rx) => acc.replace(rx.val, rx.sub), element);
    }

    /**
     * Interpret the input file to make it stylish. 
     */
    makePretty() {
        this.pretty = this.raw;;
        this.parsers.forEach(parser => {
            this.parse(parser.method, parser.rx).forEach(item => {
                this.pretty = this.pretty.replace(item.raw, item.pretty);
            });
        });

        this.parseList('ul', RegexConstants.UNORDERED_LIST);
        this.parseList('ol', RegexConstants.ORDERED_LIST);
        this.pretty = this.pretty.split('\n\n').map(item => {
            let firstChar = item.substring(0, 1);
            if(firstChar == '<') { return item; }
            const p = document.createElement('p');
            p.innerHTML = this.textualRegex(item);
            return firstChar == '<' ? item : p.outerHTML;
        }).join('\n\n');
    }

    parseList(htmlListType, regex) {
        let m; 
        let htmlList = document.createElement(htmlListType);
        let rawList = '';
        const matchIterator = this.pretty.matchAll(regex);
        while( (m = matchIterator.next()) != null && !m.done) {
            rawList = rawList + m.value[0] + this.eol;
            const li = document.createElement('li');
            li.innerHTML = this.textualRegex(m.value.groups.content);
            htmlList.appendChild(li);
            const firstIndex = this.pretty.indexOf(rawList);
            const char = this.pretty[firstIndex + rawList.length];
            if(typeof char === 'undefined' || char.match(/\n|\r/)) {
                this.pretty = this.pretty.slice(0, firstIndex) + htmlList.outerHTML + this.pretty.substring(firstIndex + rawList.length);
                htmlList = document.createElement(htmlListType);
                rawList = '';
            }
        }
    }

    parse(matchParser, regex) {
        const matchesIterator = this.pretty.matchAll(regex);
        let m; let elements = [];
        while( (m = matchesIterator.next()) != null && !m.done) {
            const tag = matchParser(m.value.groups);
            elements.push({ raw: m.value[0], pretty: tag.outerHTML });
        }
        return elements;
    }

    parseTitles(groups) {
        const level = (typeof groups !== 'undefined' && typeof groups.level !== 'undefined') ? groups.level.length : 10;
        const content = (typeof groups !== 'undefined' && typeof groups.content !== 'undefined') ? groups.content : '';
        let tag = document.createElement(`h${level}`);
        tag.innerHTML = content;
        return tag;
    }

    parseCodeBlocks(groups){
        let tag = document.createElement('pre');
        const language = (typeof groups !== 'undefined' && typeof groups.language !== 'undefined') ? groups.language.toLocaleLowerCase() : '';
        const content = (typeof groups !== 'undefined' && typeof groups.content !== 'undefined') ? groups.content : '';
        tag.className = 'code pretty';
        tag.innerHTML =  blockBuilder(content, language).content;
        return tag;
    }

    parseImages(groups) {
        let tag = document.createElement('img');
        tag.className = 'center';
        const src = (typeof groups !== 'undefined' && typeof groups.src !== 'undefined') ? groups.src : '';
        tag.alt = (typeof groups !== 'undefined' && typeof groups.alt !== 'undefined') ? groups.alt : '';
        tag.src = src.match(/^\/.+$/) ? src : this.rootFolder + src.substring(1);
        return tag;
    }
};

/**
 * Update the view based on the raw/pretty switch state.
 */
function render() {
    const rawSwitch = document.querySelector('#raw');
    const content = document.querySelector('#content');
    if (rawSwitch.checked && md != null && md.isReady()){
        content.innerHTML = '';
        content.appendChild(md.getRaw());
    } else if (!rawSwitch.checked && md != null && md.isReady()){
        const rawMd = document.querySelector('#rawMarkdown');
        if(rawMd != null) {
            content.removeChild(rawMd);
        }
        content.innerHTML = md.getPretty();
    }
}

/**
 * File drag and drop listeners.
 */
document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length == 1){
        const file = e.dataTransfer.files[0];let ext;
        if ( (ext = file.name.match(RegexConstants.FILE_EXTENSION)) != null && ext[0] === '.md'){
            md = new MdContent(file);
            setTimeout(render, 1000);
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
    render();
});
