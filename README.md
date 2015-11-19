# managejs [![Build Status](https://travis-ci.org/purplebamboo/managejs.svg?branch=master)](https://travis-ci.org/purplebamboo/managejs)

managejs is a fast tiny library to make you easy control your javascript source code.the api is like jquery.

中文文档见[这里](./README_ZH.md)

## Installation

`npm install managejs`

## Test
`npm test`
## example

```js

var managejs = require('managejs');

var testStr = 'var a = function (m,n){}';

var rootNode = managejs.transfer(testStr);//return root node

var fnNodes = rootNode.find('FunctionExpression','a');

console.log(fnNodes.stringify());
//function (m,n){}

fnNodes.append('var test = "xxx"');
console.log(fnNodes.stringify());
//function (m,n){var test = "xxx"}

```
* `transfer` is used to translate souce code to a root JsNodelist.
* `find` all JsNodelist have this method.which can find children nodes by **ast node type** and the corresponding of the **identity**
* `append` is used to append a  piece of code to the function

## Introduction

### ast node type

ast node type is the type of the souce code.
all ast node type can be find in this address.[SpiderMonkey](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API#Programs)


### selector

managejs use ast node type to find nodes。
managejs will wrap the ast node,just like the jquery did to the dom node.in managejs,selector method will return a JsNodelist which conrespond to the nodelist in jquery.JsNodelist object has a lot method.of course you can go on find node through the return JsNodelist.

there are four find method：
#### 1.findById

- param {string} type  ast node type，all type in [SpiderMonkey](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API)。

- param {string} reg  the match string,can be a Regular Expression。

- return {JsNodeList} return the finded JsNodelist object

a find method,use identify to search.so what is the identify?

for those ObjectExpression，FunctionExpression，ArrayExpression，Literal an so on：

```js
var t = expression;
var a = {
 t:expression
};
t = expression;

//t is the identify
```

for FunctionDeclaration：

```js
function fnName(){};
//fnName is the identify

```

for IfStatement，ForStatement，WhileStatement：

```js
if(exp){}
while(exp){}
for(exp){}
//exp is the identify

```

example:
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findById('Literal','test');
```


#### 2.findByString
- param {string} type ast node type

- param {string} reg the match string,can be a Regular Expression.

- return {JsNodeList} return the finded JsNodelist object

translate current JsNodelist to source code,and test the reg.

example：
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findByString('Literal','xx');

```
#### 3. find
- param {string} type   ast node type
- param {string} reg   the match string,can be a Regular Expression.

- return {JsNodeList} return the finded JsNodelist object

a method unite the findById and findByString.it first use findById to search,if not find.then try findByString.


example：
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.find('Literal','xx');
//ca also use
root.find('Literal','test');
```



#### 4. findByFn
- param {string} type   ast node type

- param {function} fn   a function to match.only if it return true means matched.

- return {JsNodeList} return the finded JsNodelist object

use function to match,will have a jsNode as param.

example
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findByFn('Literal',function(jsNode){
 console.log(jsNode.astObj)  //ast node
 console.log(jsNode.stringify()) //translate current node to source code
 console.log(jsNode.parentJsNode()) //parent node
 return /xx/.test(jsNode.stringify());
});

```



## API

some api is only in special type JsNodelist.there also some api is suport by all type nodes.


### translate
----------
#### transfer(jsString, options)
 - @param  {string} jsString the code to be manage
 - @param  {object} options  config
 - @param  {boolean} options.remainSpace

 whether remain the space of the code.if this set true.then will remain the position of the source code.
 - @param  {boolean} options.remainComment whether remain the comment
 - @return {JsNodelist}      root JsNodelist.

used to translate a javascript source code to a root JsNodelist.


example
```js
root = require('managejs').transfer("var a = 1;");
root.stringify();
```
### selector
----------
findById，findByString，find，findByFn，see the introduction for detail.

### common api
----------

#### stringify()
get the source code of current JsNodelist.if JsNodelist object has not only one Jsnode.then will connect the source code.

example：
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.stringify(); //var test222 = 'xxxx'
```
#### getCurrentStatement()

get the parent statement node of current node.

example

```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findById('Literal','test*')    // 'xx'
root.findById('Literal','test*').getCurrentStatement() //var test222 = 'xxxx'
```

#### replaceWith(nodelist)
- @param {string|nodelist} nodelist  the code need to be replace,can be a string or a nodelist。
- @return {JsNodeList} return the new replaced JsNodeList.

example

```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findByString('Literal','xx').replaceWith("'hahaha'"); //var test222 = 'hahaha'
```

#### item()
 - @param  {JsNodelist} index  the index of current JsNode
 - @return void

like item in jquery.use item to get one of the JsNodes in JsNodeList and make a new JsNodeList.


### api for Statement node
----------
these methods is only used by statement node.
functiondeclation is also a statement.
if current node is not a statement,you can use getCurrentStatement to get the statement node of current node.

#### insertBefore(nodelist)
 - @param  {JsNodelist} nodelist the node to be insert
 - @return void

used to insert current node before the given node.

example:

```js
root = require('managejs').transfer("var a = 'xxxx';var b = 'xx'");
test = root.findById('Literal','a').getCurrentStatement()
root.findByString('VariableDeclaration','b').insertBefore(test)

```


#### insertAfter(nodelist)
 - @param  {JsNodelist} nodelist  the node to be insert
 - @return void


used to insert current node after the given node.

example:

```js
root = require('managejs').transfer("var a = 'xxxx';var b = 'xx'");
test = root.findById('Literal','a').getCurrentStatement()
root.findByString('VariableDeclaration','b').insertAfter(test)
```

### Function
----------

Function contains FunctionDeclaration，FunctionExpression。

#### getParam(index)
 - @param  {int} index  the index,can be negative number
 - @return {JsNodeList} return the finded JsNodelist

used to find a JsNodeList through index.

example:

```js
root = require('managejs').transfer("var a = function(m,n){}");
root.find('FunctionExpression','a').getParam(0).stringify();
//m
```

#### addParam(identifyName)
 - @param  {string} the param need to add
 - @return {JsNodeList} return current function node

add a new param

example:

```js
root = require('managejs').transfer("var a = function(m,n){}");
root.find('FunctionExpression','a').addParam('x').stringify();
//x
```

#### allParam()
 - @return {JsNodeList} return a JsNodelist contain all param JsNode


used to get all params

example:

```js
root = require('managejs').transfer("var a = function(m,n){}");
root.find('FunctionExpression','a').allParam().stringify();
//mn
```
#### spliceParam()
 - @param  {int} index  indicate the position of add/delete a param，can use A negative number which will start from the last.
 - @param  {int} howmany  the number of params to be deleted.can be 0.
 - @param  {string|JsNodeList} item1, ..., itemX optional.the new params to be add
 - @return {JsNodeList} return the a JsNodelist contains the deleted nodes

a method like the splice of array to manage the params.

example:

```js
root = require('managejs').transfer("function test(a,b,c){}");
root.find('FunctionDeclaration','test').splice(1,1,'m').stringify();//m

```

#### append(nodelist)

 - @param  {string|JsNodeList} the code need to be append,can be a string or a nodelist。
 - @return {JsNodeList} return current JsNodeList

append a new node in the last of `{}`

example:

```js
root = require('managejs').transfer("var a = function(m,n){var t = 0;}");
root.find('FunctionExpression','a').append('var test =1;').stringify();
```


#### prepend(nodelist)
 - @param  {string|JsNodeList} the code need to be prepend,can be a string or a nodelist。
 - @return {JsNodeList} return current JsNodeList

append a new node in the first of `{}`

example:

```js
root = require('managejs').transfer("var a = function(m,n){var t = 0;}");
root.find('FunctionExpression','a').prepend('var test =1;').stringify();
```

### ObjectExpression
----------

#### get(key)
 - @param  {string} key   the value of the key
 - @return {JsNodeList} return the finded node

used to find a node by key

example:

```js
root = require('managejs').transfer("var a = {m:1,n:2}");
root.find('ObjectExpression','a').get(0).stringify();
//1
```

#### add(key, nodelist)
 - @param  {string} a key need to add
 - @param  {string|JsNodeList} a value need to add
 - @return {JsNodeList} return the new node


add a new property node

example:

```js
root = require('managejs').transfer("var a = {m:1,n:2}");
root.find('ObjectExpression','a').add('s','3');
root.find('ObjectExpression','a').stringify();
//{m: 1,n: 2,s: 3}
```
> if you want to generate the key whith "",you can use add('"s"','3').then s will be a Literal.

#### remove(key)
 - @param  {string} key
 - @return {void}


remove a property

example:

```js
root = require('managejs').transfer("var a = {m:1,n:2}");
root.find('ObjectExpression','a').remove('n');
root.find('ObjectExpression','a').stringify();
//{ m: 1 }
```
### ArrayExpression
----------
#### get(index)
 - @param  {int} index  the index,can be negative number
 - @return {JsNodeList} return the finded node

get the node through index

example:

```js
root = require('managejs').transfer("var a = [1,2,3,4]");
root.find('ArrayExpression','a').get(-1).stringify();//4

```
#### splice()
 - @param  {int} index  indicate the position of add/delete a item,can use A negative number which will start from the last.
 - @param  {int} howmany  the number of items to be deleted.can be 0.
 - @param  {string|JsNodeList} item1, ..., itemX optional.the new params to be add
 - @return {JsNodeList} return the a JsNodelist contains the deleted nodes

a method like the splice of array to manage the params.

example:

```js
root = require('managejs').transfer("var a = [1,2,3,4]");
root.find('ArrayExpression','a').splice(1,1,'4').stringify();//2

```
#### push(nodelist)
 - @param  {string|JsNodelist} nodelist the code need to be push,can be a string or a nodelist。
 - @return {JsNodeList} return the new JsNodelist


push new node

example:
```js
root = require('managejs').transfer("var a = [1,2,3,4]");
root.find('ArrayExpression','a').push('5');
root.find('ArrayExpression','a').get(-1).stringify();//5;

```


### IfStatement， ForStatement， WhileStatement
----------

#### append(nodelist)

 - @param  {string|JsNodeList} the code need to be append,can be a string or a nodelist。
 - @return {JsNodeList} return current JsNodeList

append a new node in the last of `{}`


example:

```js
root = require('managejs').transfer("if(a){}");
root.find('IfStatement','a').append('var test =1;').stringify();
```


#### prepend(nodelist)
 - @param  {string|JsNodeList} the code need to be prepend,can be a string or a nodelist。
 - @return {JsNodeList} return current JsNodeList

prepend a new node in the last of `{}`

example:

```js
root = require('managejs').transfer("if(a){}");
root.find('IfStatement','a').prepend('var test =1;').stringify();
```


### CallExpression
----------

#### getParam(index)
 - @param  {int} index  the index,can be negative number
 - @return {JsNodeList} return the finded node

get the node through index

example:

```js
root = require('managejs').transfer("var a = test(m,n)");
root.find('CallExpression','a').get(-1).stringify();
//n
```

#### allParam()
 - @return {JsNodeList} return a JsNodelist contain all param JsNode

#### spliceParam()
 - @param  {int} index  indicate the position of add/delete a item,can use A negative number which will start from the last.
 - @param  {int} howmany  the number of items to be deleted.can be 0.
 - @param  {string|JsNodeList} item1, ..., itemX optional.the new params to be add
 - @return {JsNodeList} return the a JsNodelist contains the deleted nodes

a method like the splice of array to manage the params.

example:

```js
root = require('managejs').transfer("test(a,b,c)");
root.find('CallExpression','test').spliceParam(1,1,'m');
root.find('CallExpression','test').stringify();//test(a,m,c)

```

## License

MIT




