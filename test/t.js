
var t = require('../index.js');


var testStr = require('fs').readFileSync('./test/simple.js').toString();


var root = t.transfer(testStr);


console.log(root.find('ForStatement','a').append('var test = 1;').find('VariableDeclaration','test').stringify());
