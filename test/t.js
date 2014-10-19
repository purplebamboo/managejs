
var t = require('../index.js');


var testStr = require('fs').readFileSync('./test/simple.js').toString();


var testNode = t.transfer(testStr,{remainSpace:false,remainComment:true});




t = testNode.findById('WhileStatement','2')
			var ob = testNode.findById('ObjectExpression','test2').getCurrentStatement()
			t.insertBefore(ob)

console.log(testNode.find('WhileStatement','2').length);


//console.log(root.find('FunctionDeclaration','aa').stringify());