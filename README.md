# Markov text generator

A little experiment salvaged from hot mess of js projects.

## What does it do?

This tool generates random text character by character based on Markov chains using custom memory-efficient prefix tree.

This is example of nonsense it can make:

> Unrip'dst the bowels of their
> burrows, like conies after rain, and revel all with
> him.
> 
> First Senator:
> From whence came
> That Ancus Marcius;
> I'll lean upon
> justice, sir, and do bring in cloudy night immediately we do exile him hence
> Were but a feigned friend,
> That, if they do, yet will I keep thee safe.

(trained on Shakespeare's texts)

### Memory efficient prefix tree you say?

Yeah, that was kinda reinveting the wheel for fun. Naive implementation (nodes are nested JS objects) has too much overhead - for example, two MiB of text can create a tree with about a million nodes, which takes up more than 2 GiB of RAM. And the node consists just from a single character, number and an array of children - nothing fancy or overengineered. And I wanted to run it on a cheap VPS with 512 MiB RAM!

So I just packed everything into Int32Array and thrown in a handful of "pointer" maths. And it ended up pretty neat - same tree can be stored as ~100 MiB array of raw data. Also it doesn't need to be unpacked and can be read directly from file, which is a bonus.

On the downside, the search in tree is O(n) instead of O(log(n)). But hey, the loss of speed totally worth it.

## Usage

First, clone and prepare:

```
git clone https://github.com/grgdkfa/markov-text.git
cd markov-text
npm install
```

To compile trie from text: 

```
node preprocess.js input.txt -o output.ngram -r 10
```

Available options:

- `--input` (`-i`) - input file (default and required option)
- `--output` (`-o`) - output file. Required. The .ngram extension is added automatically
- `--order` (`-r`) - max depth of prefix tree (default: 6). Low depth produces small files, but generated results are not very cohesive. High depth is more interesting, but produces larger files. Numbers greater than 12 or less than 6 is usually useless

To generate text from compiled tree:

```
node generate.js output.ngram
```

Available options:

- `--input` (`-i`) - input .ngram file (default and the only required option)
- `--start` (`-s`) - starting text
- `--length` (`-l`) - length of generated text (not including starting)
- `--temperature` (`-t`) - temperature, real number >= 0. The higher the value, the more random text will be (interesting stuff to play with)
- `--order` (`-r`) - depth that should be used (depth of the tree is default)
- `--randomfunc` (`-f`) - random function that should be used for selecting next character. Can have two values:
- - `weighted` (default) - uses information about character probabilities in source text
- - `uniform` - doesn't care about probabilities, uses uniform distibution

The last option has very little effect, but it may be different for your texts.

Also, there is little web frontend to play with/show your friends:

```
node serve.js text1.ngram text2.ngram text3.ngram -p 9005
```

`-p` is option for port. You can load multiple trees and select them via web page.

