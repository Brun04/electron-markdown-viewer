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

/**
 * Return a code block styler according to the language.
 * 
 * @param {str} raw - The raw code block
 * @param {str} language - The code block language
 * @returns A code block styler
 */
let blockBuilder = (raw, language) => {
    switch (language) {
        case 'json':
            return new JSONBlock(raw);
        case 'bash':
            return new BashBlock(raw);
        case 'ini':
            return new INIBlock(raw);
        default:
            return new DefaultBlock(raw);
    }
};

/**
 * Class representing a default code block.
 */
class DefaultBlock {
    constructor(raw){
        this.content = '<br>';
        raw.split('\n').forEach(line => {
            let p = document.createElement('p');
            p.innerHTML = line;
            this.content += p.outerHTML;
        })
        this.content += '<br>';
    }
}

/**
 * Class representing a bash code block.
 */
class BashBlock {

    constructor(raw){
        this.content = '<br>';
        raw.split('\n').forEach(line => {
            let p = document.createElement('p');
            p.innerHTML = this.isComment(line);
            this.content += p.outerHTML;
        })
        this.content += '<br>';
    }

    /**
     * Change the style of the line is a comment.
     * 
     * @param {str} line - The line to check
     * @returns A modified line and true or the original line and false
     */
    isComment(line){
        return line.substr(0, 1) === '#' ? `<span class="green-it">${line}</span>` : line;
    }
}

/**
 * Class representing a JSON code block.
 */
class JSONBlock {

    constructor(raw){
        this.content = '<br>';
        try{
            this.content += '<pre>'+this.syntaxHighlight(JSON.stringify(JSON.parse(raw), null, '\t'))+'</pre>';
        }catch(error) {
            console.error(error);
            raw.split('\n').forEach(line => {
                let p = document.createElement('p');
                p.innerText = line;
                this.content += p.outerHTML;
            })
        }finally {
            this.content += '<br>';
        }
    }

    syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }
}

/**
 * Class representing an INI code block.
 */
class INIBlock {

    constructor(raw){
        this.content = '<br>';
        this.tests = [
            this.isComment.bind(this),
            this.isSection.bind(this),
            this.isItem.bind(this)
        ];
        raw.split('\n').forEach(line => {
            let i=0; let res = ['', false];
            let p = document.createElement('p')
            do{
                res = this.tests[i](line);i++;
            }while(!res[1] && i < this.tests.length);
            if(res[1] ){ p.innerHTML = res[0]; }
            this.content += p.outerHTML;
        })
        this.content += '<br>';
    }

    /**
     * Change the style of the line is a comment.
     * 
     * @param {str} line - The line to check
     * @returns A modified line and true or the original line and false
     */
    isComment(line){
        return line.substr(0, 1) === '#' ? [`<span class="ini-comment">${line}</span>`, true] : [line, false];
    }

    /**
     * Change the style of the line is a section header.
     * 
     * @param {str} line - The line to check 
     * @returns A modified line and true or the original line and false
     */
    isSection(line){
        return line.match(/\[[a-z]+\]/) ? [`<span class="ini-section">${line}</span>`, true] : [line, false];
    }

    /**
     * Change the style in the line is an item.
     * 
     * @param {str} line - The line to check
     * @returns A modified line and true or the original line and false
     */
    isItem(line){
        if(line.match(/[a-zA-Z\_\.]+=/)){
            const items = line.split('=');
            let values = this.isComment(items[1]);
            let value = values[1] ? values[0] : items[1];
            return [`<span class="ini-key">${items[0]}</span>=${value}`, true];
        }
        return [line, false];
    }
}