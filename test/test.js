var assert = require("assert")
var t = require('../index.js')

var basicTestStr,testNode,testNode2,node

describe('basic',function(){
	
	beforeEach(function(){
		basicTestStr = require('fs').readFileSync('./test/simple.js').toString()
		testNode = t.transfer(basicTestStr,{removeSpace:true})
	})

	describe('#find',function(){
		it('check length',function(){ 
      assert.equal(2, testNode.find('ObjectExpression','test*').length)		
		})

		it('find by type witout idenfier',function(){
			assert.equal(2, testNode.find('ObjectExpression').length)	
		})
		
	})
	describe('#stringify',function(){
		it('stringify will translate the ast to string',function(){
			assert.equal('View.superclass.constructor.apply(this, arguments)', testNode.find('CallExpression','superclass.constructor').stringify())
			
		})

		it('result strings will connect if there are more than one result nodes',function(){
			assert.equal("'hello''hello world'", testNode.find('ObjectExpression','test').find('Literal','hello').stringify())
			
		})
		
	})

})

describe('Function',function(){

	beforeEach(function(){
		basicTestStr = require('fs').readFileSync('./test/function.js').toString()
		testNode = t.transfer(basicTestStr)
	})

	describe('#getParam',function(){
		it('Function can be find by idenfier',function(){
			assert.equal(1, testNode.find('FunctionDeclaration','test').length)
			assert.equal(2, testNode.find('FunctionExpression','test').length)

		})

		it('getParam can return the nodelist through the index',function(){
			assert.equal('a', testNode.find('FunctionDeclaration','test').getParam('0').stringify())
		})

		it('getParam can use negative number to return the nodelist',function(){
			assert.equal('b', testNode.find('FunctionDeclaration','test').getParam('-1').stringify())
		})

		it('use replaceWith',function(){
			testNode.find('FunctionDeclaration','test').getParam('-1').replaceWith('c')
			assert.equal('c', testNode.find('FunctionDeclaration','test').getParam('-1').stringify())
		})

	})

	describe('#addParam and allParam',function(){
		it('add addParam should make length +1',function(){
			assert.equal(3,testNode.find('FunctionDeclaration','test').addParam('v').allParam().length)
		})


	})
	describe('#append and prepend',function(){
		it('function can appnd string',function(){
			var fun = testNode.find('FunctionExpression','test2')
			fun.append('var mm = b;')
			assert.equal(1,fun.find('VariableDeclaration','mm').length)

		})
		it('function can prepend string',function(){
			var fun = testNode.find('FunctionExpression','test2')
			fun.prepend('var mm = b;')
			assert.equal(1,fun.find('VariableDeclaration','mm').length)

		})
		
	})

})



describe('ObjectExpression',function(){
	beforeEach(function(){
		basicTestStr = require('fs').readFileSync('./test/objectExpression.js').toString()
		testNode = t.transfer(basicTestStr)
	})

	describe('#get',function(){
		it('use get to get the node through the key',function(){
			assert.equal("'hellow world'",testNode.find('ObjectExpression','test').get('m').stringify())
		})

	})

	describe('#add',function(){
		it('use add to add property',function(){
			var node = testNode.find('ObjectExpression','test')
			node.add('a',"'hahaha'")
			assert.equal("'hahaha'",node.get('a').stringify())
		})
	})

	describe('#remove',function(){
		it('use remove to remove property',function(){
			var node = testNode.find('ObjectExpression','test')
			node.remove('m')
			assert.equal(0,node.find('m').length)
		})
	})
})

describe('ArrayExpression',function(){
	beforeEach(function(){
		basicTestStr = require('fs').readFileSync('./test/arrayExpression.js').toString()
		testNode = t.transfer(basicTestStr)
		node = testNode.find('ArrayExpression','test')
	})


	describe('#get',function(){
		it('use get to get node through index',function(){
			assert.equal('1',node.get(1).stringify())
		})
	})

	describe('#splice',function(){
		it('use splice to manage like array',function(){
			node.splice(1,1,'haha')
			assert.equal('haha',node.get(1).stringify())
		})
	})

	describe('#push',function(){
		it('use push to add node',function(){
			node.push('function(){}')
			assert.equal('function(){}',node.get(-1).stringify().replace(/\s/g,''))
		})
	})
	
})


describe('IfStatement ForStatement WhileStatement',function(){
	beforeEach(function(){
		basicTestStr = require('fs').readFileSync('./test/simple.js').toString()
		testNode = t.transfer(basicTestStr)
		//node = testNode.find('ArrayExpression','test')
	})

	describe('#append',function(){
		it('use append',function(){
			node = testNode.find('IfStatement','1').append('var app = 1;')
			assert.equal(1,node.find('VariableDeclaration','app').length)
		})
		
	})

	describe('#prepend',function(){
		it('use prepend',function(){
			node = testNode.find('ForStatement','a').append('var app = 1;')
			assert.equal(1,node.find('VariableDeclaration','app').length)
		})
	})
})















