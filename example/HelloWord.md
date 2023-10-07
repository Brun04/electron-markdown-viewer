# Hello World

This markdown file &#128196; aims to test all features of this **markdown viewer** based on [Electron](https://www.electronjs.org) and interpreting the markdown with regular expressions. The language in code blocks is not case sensitive.

## Code blocks

INI file rendering:

```INI
[sectionA]
item1=value1
item2=value2,value3

; This is a comment
[sectionB]
item3=value4
```

JSON file rendering:

```json
{
    "key1": "value1",
    "key2": {
        "subKey1": null,
        "subKey2": 42
    },
    "key3": true
}
```

Bash rendering:
```sh
cd /home/toto
```

## Images

Image with an alternative text set:

![Here is an image](./image_not_found.jpeg)

Image without an alternative text set:

![](./image_test.jpg)


## Lists

This is a simple unordered list:
* item 1
* item 2
* item N

This is a simple ordered list:
1. item A
2. item B
3. item C

This is another ordered list (counter must be reset):
1. Another A
2. Another C
