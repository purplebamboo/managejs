var assert = require("assert")
var t = require('../index.js')

var basicTestStr,testNode,testNode2,node

describe('common',function(){
	
	beforeEach(function(){
		basicTestStr = require('fs').readFileSync('./test/simple.js').toString()
		testNode = t.transfer(basicTestStr)
	})

	describe('#find',function(){
		it('check length',function(){ 
      		assert.equal(2, testNode.find('ObjectExpression','test*').length)		
		})

		it('find by type witout idenfier',function(){
			assert.equal(2, testNode.find('ObjectExpression').length)	
		})
		
	})

	describe('#findById',function(){
		it('use id to find node',function(){
			assert.equal(1,testNode.findById('WhileStatement','2').length)
			assert.equal('while(2){}',testNode.findByString('WhileStatement','2').stringify().replace(/\s/g,''))
		})
	})

	describe('#findByString',function(){
		it('use string to find node',function(){
			assert.equal(1,testNode.findByString('WhileStatement','2').length)
			assert.equal('while(2){}',testNode.findByString('WhileStatement','2').stringify().replace(/\s/g,''))

		})
	})

	describe('#findByFn',function(){
		it('use fn to find node',function(){
			assert.equal(1,testNode.findByFn('FunctionDeclaration',function(jsNode){
				return jsNode.astObj.id.name == 'aa'

			}).length)
		})
	})

	describe('#stringify',function(){
		it('stringify will translate the ast to string',function(){
			assert.equal('View.superclass.constructor.apply(this, arguments)', testNode.find('CallExpression','superclass.constructor').stringify())
			
		})

		it('result strings will connect if there are more than one result nodes',function(){
			assert.equal("'hello world''hello'", testNode.find('ObjectExpression','test').find('Literal','hello').stringify())
			
		})
		
	})

	describe('#insertBefore',function(){
		it('use insertBefore to change node',function(){
			var t = testNode.findById('WhileStatement','2')
			var ob = testNode.findById('ObjectExpression','test2').getCurrentStatement()
			t.insertBefore(ob)
			assert.equal(2,testNode.find('WhileStatement','2').length)
		})
	})

	describe('#insertAfter',function(){
		it('use insertAfter to change node',function(){
			var t = testNode.findById('WhileStatement','2')
			var ob = testNode.findById('ObjectExpression','test2').getCurrentStatement()
			t.insertAfter(ob)
			assert.equal(2,testNode.find('WhileStatement','2').length)
		})
	})

	describe('#item',function(){
		it('use item to get a new nodelist through index',function(){
			var ob = testNode.findById('ObjectExpression','test')
			assert.equal("'hello world'",ob.item(0).get('mn').stringify())
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
			node = testNode.find('ObjectExpression','test')
			node.add('a',"'hahaha'")
			assert.equal("'hahaha'",node.get('a').stringify())
		})
	})

	describe('#remove',function(){

		it('use remove to remove property',function(){
			node = testNode.find('ObjectExpression','test')
			node.remove('m')
			assert.equal(0,node.find('m').length)
		})
		it('test only one key',function(){

			node = testNode.find('ObjectExpression','test')
			node.remove('m')
			node.remove('n')
			assert.equal('{}',node.stringify())
		})
	})
})

describe('ArrayExpression',function(){
	beforeEach(function(){
		basicTestStr = require('fs').readFileSync('./test/arrayExpression.js').toString()
		testArrayNode = t.transfer(basicTestStr)
		arrayNode = testArrayNode.find('ArrayExpression','test')
	})


	describe('#get',function(){
		it('use get to get node through index',function(){
			assert.equal('1',arrayNode.get(1).stringify())
		})
	})

	describe('#splice',function(){
		it('use splice to manage like array',function(){
			arrayNode.splice(1,1,'haha')
			assert.equal('haha',arrayNode.get(1).stringify())
		})
	})

	describe('#push',function(){
		it('use push to add node',function(){
			arrayNode.push('function(){}')
			assert.equal('function(){}',arrayNode.get(-1).stringify().replace(/\s/g,''))
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
			node = testNode.find('ForStatement','a').prepend('var app = 1;')
			assert.equal(1,node.find('VariableDeclaration','app').length)
		})
	})
})















