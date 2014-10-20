# managejs [![Build Status](https://travis-ci.org/purplebamboo/managejs.svg?branch=master)](https://travis-ci.org/purplebamboo/managejs)

managejs是使用nodejs编写的基于语法树的js源码分析操作工具。通过managejs，可以使用类似jQuery的操作方式来操作你的javascript源代码。

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
* `transfer`用于返回javascript源码的根节点
* `find`使用**语法树节点类型**，还有对应的**标识**来查找节点
* `append`用于往function里面注入一段代码

## Introduction
### 语法树节点类型（ast node type）

javascript源码被词法语法分析后，会变成语法树。每个树节点对应一段源码。可以[点此](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API#Programs)通过mozilla的文档了解。

如果不是很清楚一段源码的语法树结构，可以通过Esprima的[在线解析器](http://esprima.org/demo/parse.html#)查看。

比如上面那段代码`var a = function (m,n){}`解析成语法树为：
```js
{
    "type": "Program",
    "body": [
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "a"
                    },
                    "init": {
                        "type": "FunctionExpression",
                        "id": null,
                        "params": [
                            {
                                "type": "Identifier",
                                "name": "m"
                            },
                            {
                                "type": "Identifier",
                                "name": "n"
                            }
                        ],
                        "defaults": [],
                        "body": {
                            "type": "BlockStatement",
                            "body": []
                        },
                        "rest": null,
                        "generator": false,
                        "expression": false
                    }
                }
            ],
            "kind": "var"
        }
    ]
}

```

### 选择器

managejs使用节点类型+标识符的方式来查找定位节点。之后这些节点会具有一系列的方法用于处理当前节点。并且支持链式操作可以继续在此节点的基础上往下查找。

选择器有四个查找函数：
#### 1.findById

- param {string} type 语法树节点类型(ast type)，所有SpiderMonkey支持的类型都可以。
	  https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API
- param {string} reg 匹配的字符串，支持正则写法。

- return {JsNodeList} 返回找到的节点集合对象


查找函数，通过（id）来查找。什么是当前节点的标识（id）呢？

* 对于ObjectExpression，FunctionExpression，ArrayExpression，Literal等表达式来说：
```js
var t = 表达式;  
var a = {
 t:表达式
};
t = 表达式;

//t就是当前表达式的标识(id)
```
	 
* 对于FunctionDeclaration来说：
```js
function fnName(){};
//fnName就是当前表达式的标识

```

* 对于IfStatement，ForStatement，WhileStatement来说：
```js
if(exp){}
while(exp){}
for(exp){}
//exp就是当前表达式的标识

```
	 
example:
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findById('Literal','test');
```

#### 2.findByString
- param {string} type 语法树节点类型(ast type)
	  
- param {string} reg 匹配的字符串，支持正则写法。

- return {JsNodeList} 返回找到的节点集合对象


使用字符串匹配，会将当前节点解析成字符串进行查找
	 
example：
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findByString('Literal','xx');

```
#### 3. find
- param {string} type 语法树节点类型(ast type)
- param {string} reg 匹配的字符串，支持正则写法。

- return {JsNodeList} 返回找到的节点集合对象

查找函数，是findById与findByString的结合体，会先尝试使用findById查找，如果找不到，就使用字符串匹配查找。

example：
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.find('Literal','xx');
//sam as 
root.find('Literal','test');
```
	  
	  

#### 4. findByFn
- param {string} type 语法树节点类型(ast type)
	  
- param {function} fn 匹配的函数，函数返回值为true代表匹配成功，否则匹配失败。

- return {JsNodeList} 返回找到的节点集合对象
	  
自定义函数匹配，会将当前jsNode作为参数注入。
	 
example
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findById('Literal',function(jsNode){
 console.log(jsNode.astObj)  //抽象语法树节点
 console.log(jsNode.stringify()) //将当前节点解析为字符串
 console.log(jsNode.parentJsNode()) //父节点
 return /xx/.test(jsNode.stringify()); //为true代表匹配成功
});

```


`function (m,n){}`是一个FunctionExpression节点。我们通过标识a来最终找到这个节点。
查到到的对象都是JsNodeList的节点集合对象。可以通过一些函数来操作这些节点。

## API
有些api是部分节点类型才支持的，有些是所有都支持的。


### 源码解析
----------
#### transfer(jsString, options)
 - @param  {string} jsString 需要解析的字符串
 - @param  {object} options  配置项
 - @param  {boolean} options.remainSpace 是否保留各种空格，为true的话会保留以前的格式。会消耗性能，并且容易出错
 - @param  {boolean} options.remainComment 是否保留注释
 - @return {JsNodeList}      根节点，JsNodeList对象，可以使用提供的一系列方法

用于将一段javascript字符串 解析成一个JsNodeList对象
 
example
```js
root = require('managejs').transfer("code");
root.stringify();
```
### 选择器
----------
findById，findByString，find，findByFn，详见介绍章节选择器部分

### 通用api
#### stringify()

解析当前节点生成源代码

example：
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.stringify(); //var test222 = 'xxxx'
```
#### getCurrentStatement()
获取当前节点所在的语句(statement)节点

example
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findById('Literal','test*')    // 'xx'
root.findById('Literal','test*').getCurrentStatement() //var test222 = 'xxxx'
```

#### replaceWith(nodelist)
- @param {string|nodelist} nodelist 需要替换的类容，可以是字符串，或者JsNodeList对象。
- @return {JsNodeList} 返回替换后的新节点
替换当前节点集合

example
```js
root = require('managejs').transfer("var test222 = 'xxxx'");
root.findById('Literal','xx').replaceWith("'hahaha'"); //var test222 = 'hahaha'
```

#### item()
 - @param  {JsNodelist} index 节点的位置
 - @return void
类似jQuery里面的item。选择器获取到的都是节点集合JsNodeList可以使用这个item返回里面的某一个节点生成的新的JsNodeList。


### 语句类型通用api
----------
下面的函数是只有语句类型的节点才能使用，包括函数声明等等。如果当前的节点不是语句类型的可以使用上面的getCurrentStatement获得父级语句节点。

#### insertBefore(nodelist)
 - @param  {JsNodelist} nodelist 指定节点
 - @return void
用于将当前的节点插入到指定节点的前面

example:
```js
root = require('managejs').transfer("var a = 'xxxx';var b = 'xx'");
test = root.findById('Literal','a').getCurrentStatement()
root.findByString('VariableDeclaration','b').insertBefore(test) 

```


#### insertAfter(nodelist)
 - @param  {JsNodelist} nodelist指定节点
 - @return void
用于将当前的节点插入到指定节点的后面

example:
```js
root = require('managejs').transfer("var a = 'xxxx';var b = 'xx'");
test = root.findById('Literal','a').getCurrentStatement()
root.findByString('VariableDeclaration','b').insertAfter(test) 
```

### Function
----------

Function包括 FunctionDeclaration，FunctionExpression。
#### getParam(index)
 - @param  {int} index 索引，可以为负数
 - @return {JsNodeList} 返回获取到的节点
用于通过index获取参数节点。

example:
```js
root = require('managejs').transfer("var a = function(m,n){}");
root.find('FunctionDeclaration','a').getParam(0).stringify();
//m
```

#### addParam(identifyName)
 - @param  {string} 需要添加的参数名
 - @return {JsNodeList} 返回新增的节点
增加新的参数

example:
```js
root = require('managejs').transfer("var a = function(m,n){}");
root.find('FunctionDeclaration','a').addParam('x').stringify();
//x
```

#### allParam()
 - @return {JsNodeList} 返回所有参数节点
获取所有的参数节点
example:
```js
root = require('managejs').transfer("var a = function(m,n){}");
root.find('FunctionDeclaration','a').allParam().stringify();
//mn
```
#### spliceParam()
 - @param  {int} index，整数，规定添加/删除项目的位置，使用负数可从数组结尾处规定位置。
 - @param  {int} howmany 要删除的项目数量。如果设置为 0，则不会删除项目。
 - @param  {string|JsNodeList} item1, ..., itemX 可选。向数组添加的新项目。
 - @return {JsNodeList} 返回删除的数组节点
使用类似数组的splice方法。来操作参数
example:
```js
root = require('managejs').transfer("function test(a,b,c){}");
root.find('CallExpression','test').splice(1,1,'m').stringify();//m

```

#### append(nodelist)

 - @param  {string|JsNodeList} 需要append的类容，可以是字符串也可以是JsNodeList对象
 - @return {JsNodeList} 返回当前节点
在｛｝最后面添加新的语句节点

example:
```js
root = require('managejs').transfer("var a = function(m,n){var t = 0;}");
root.find('FunctionDeclaration','a').append('var test =1;').stringify();
```


#### prepend(nodelist)
 - @param  {string|JsNodeList} 需要append的类容，可以是字符串也可以是JsNodeList对象
 - @return {JsNodeList} 返回当前节点
在｛｝最前面添加语句节点
example:
```js
root = require('managejs').transfer("var a = function(m,n){var t = 0;}");
root.find('FunctionDeclaration','a').prepend('var test =1;').stringify();
```

### ObjectExpression
----------

#### get(key)
 - @param  {string} key，key的值
 - @return {JsNodeList} 返回获取到值的节点

通过key获取值节点
example:
```js
root = require('managejs').transfer("var a = {m:1,n:2}");
root.find('ObjectExpression','a').get(0).stringify();
//1
```

#### add(key, nodelist)
 - @param  {string|JsNodeList} 需要增加的key
 - @param  {string|JsNodeList} 需要增加的value
 - @return {JsNodeList} 返回新增的节点
增加节点
example:
```js
root = require('managejs').transfer("var a = {m:1,n:2}");
root.find('ObjectExpression','a').add('s','3');
root.find('ObjectExpression','a').get(-1).stringify();
//3
```
> 如果希望生成带引号的key或者value，可以add('"s"','3')。带引号的值会解析成Literal，否则会解析成Identifier。

#### remove(key)
 - @param  {string} key，key的值
 - @return {void} 
删除节点
example:
```js
root = require('managejs').transfer("var a = {m:1,n:2}");
root.find('ObjectExpression','a').add('s','3');
root.find('ObjectExpression','a').get(-1).stringify();
//3
```
### ArrayExpression
----------
#### get(index)
 - @param  {int} index，索引可以为负数，代表从后面开始
 - @return {JsNodeList} 返回获取到值的节点
获取数组节点
example:
```js
root = require('managejs').transfer("var a = [1,2,3,4]");
root.find('ArrayExpression','a').get(-1).stringify();//4

```
#### splice()
 - @param  {int} index，整数，规定添加/删除项目的位置，使用负数可从数组结尾处规定位置。
 - @param  {int} howmany 要删除的项目数量。如果设置为 0，则不会删除项目。
 - @param  {string|JsNodeList} item1, ..., itemX 可选。向数组添加的新项目。
 - @return {JsNodeList} 返回删除的数组节点
类似数组的splice方法。
example:
```js
root = require('managejs').transfer("var a = [1,2,3,4]");
root.find('ArrayExpression','a').splice(1,1,'4').stringify();//[1,4,3,4]

```
#### push(nodelist)
 - @param  {string|JsNodelist} 需要添加的类容
 - @return {JsNodeList} 返回新增的节点
添加新的节点。
example:
```js
root = require('managejs').transfer("var a = [1,2,3,4]");
root.find('ArrayExpression','a').push('5');
root.find('ArrayExpression','a').get(-1).stringify();//5;

```


### IfStatement， ForStatement， WhileStatement
----------

#### append(nodelist)
 - @param  {string|JsNodeList} 需要append的类容，可以是字符串也可以是JsNodeList对象
 - @return {JsNodeList} 返回当前节点
在｛｝最后面添加新的语句节点

example:
```js
root = require('managejs').transfer("if(a){}");
root.find('IfStatement','a').append('var test =1;').stringify();
```


#### prepend(nodelist)
 - @param  {string|JsNodeList} 需要append的类容，可以是字符串也可以是JsNodeList对象
 - @return {JsNodeList} 返回当前节点
在｛｝最前面添加语句节点
example:
```js
root = require('managejs').transfer("if(a){}");
root.find('IfStatement','a').append('var test =1;').stringify();
```


### CallExpression
----------

#### get(index)
 - @param  {int} index，索引可以为负数，代表从后面开始
 - @return {JsNodeList} 返回获取到值的节点
用于通过index获取参数节点。

example:
```js
root = require('managejs').transfer("var a = test(m,n)");
root.find('CallExpression','a').get(-1).stringify();
//n
```
#### spliceParam()
 - @param  {int} index，整数，规定添加/删除项目的位置，使用负数可从数组结尾处规定位置。
 - @param  {int} howmany 要删除的项目数量。如果设置为 0，则不会删除项目。
 - @param  {string|JsNodeList} item1, ..., itemX 可选。向数组添加的新项目。
 - @return {JsNodeList} 返回删除的数组节点
类似数组的splice方法。用来操作参数。
example:
```js
root = require('managejs').transfer("test(a,b,c)");
root.find('CallExpression','test').splice(1,1,'m');
root.find('CallExpression','test').stringify();//test(a,m,c)

```

## License

MIT




