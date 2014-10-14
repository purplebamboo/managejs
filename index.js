var acorn = require("./lib/acorn.js");
var walk = require("./lib/walk.js");
var escodegen = require("escodegen");

var _ = require('underscore');



function matchCallExpression(jsNode, reg) {

	var astNode = jsNode.astObj;
	var callString = "";
	var oriArguments = astNode.arguments;
	astNode.arguments = [];
	callString = escodegen.generate(astNode);
	//console.log(escodegen.generate(astNode));
	astNode.arguments = oriArguments;

	return reg.test(callString);

}


function matchFunctionDeclaration(jsNode, reg) {
	var astNode = jsNode.astObj;
	var identify = astNode.id.name;

	return reg.test(identify);
}


function matchForStatement(jsNode, reg) {

	var astNode = jsNode.astObj;
	var oriBody = astNode.body;
	astNode.body = {
        "type": "BlockStatement",
        "body": []
    };
	var testString = escodegen.generate(astNode);
	astNode.body = oriBody;

	return reg.test(testString);
}

function matchIfStatement(jsNode,reg){
	var astNode = jsNode.astObj;
	var testString = escodegen.generate(astNode.test);

	return reg.test(testString);
}
function matchWhileStatement(jsNode,reg){
	var astNode = jsNode.astObj;
	var testString = escodegen.generate(astNode.test);

	return reg.test(testString);
}

function matchIdetify(jsNode, reg){
	var astNode = jsNode.astObj;
	var parentAstNode = jsNode.parentJsNode.astObj;

	if (parentAstNode.type == "VariableDeclarator") {
		return reg.test(parentAstNode.id.name);
	}

	if (parentAstNode.type == "Property") {
		return reg.test(parentAstNode.key.name);
	}

	if (parentAstNode.type == "AssignmentExpression") {
		return reg.test(escodegen.generate(parentAstNode.left));
	}

	return false;

}

function matchString(jsNode, reg) {
	var astNode = jsNode.astObj;
	var testString = escodegen.generate(astNode);

	return reg.test(testString);


} 	

MATCH_HASH = {
	'CallExpression': matchCallExpression,
	'ObjectExpression': matchIdetify,
	'FunctionExpression': matchIdetify,
	'ArrayExpression': matchIdetify,
	'FunctionDeclaration': matchFunctionDeclaration,
	'IfStatement': matchIfStatement,
	'ForStatement': matchForStatement,
	'WhileStatement': matchWhileStatement
}


var walkBase = walk.make({
	'VariableDeclarator': function(node, st, c) {
		if (node.init) c(node.init, st, "Expression");
	},
	'VariableDeclaration': function(node, st, c) {
		for (var i = 0; i < node.declarations.length; ++i) {
			var decl = node.declarations[i];
			c(decl, st);
		}
	}

})

function walkAst(node, visitors, base, state) {
	if (!base) base = walkBase;
	if (!state) state = {};

	function c(node, st, override) {
		var type = override || node.type,
			found = visitors[type];


		var jsNode = new JsNode(node);

		if (!override) {
			jsNode.parentJsNode = st.prevNode;
			st.prevNode = jsNode;

		}
		
		base[type](node, st, c);

		if (!override) st.prevNode = jsNode.parentJsNode;

		if (found) found(jsNode, st);
	}
	c(node, state);
};


function matchJsNode(jsNode, reg) {
	var astNode = jsNode.astObj;
	var type = astNode.type;
	//默认 字符串匹配
	var matchFn = _.has(MATCH_HASH,type) ? MATCH_HASH[type] : matchString;

	return matchFn(jsNode, reg);


}

function _isStatement(jsnode){
	//Declaration is also a statement
	//debugger
	var type = _.isString(jsnode) ? jsnode : jsnode.astObj.type;
	return /[a-zA-Z]+(Statement|Declaration)/.test(type);
}

// function _nodesTransfer(nodelist,type){
// 	if(type && type == )

// }

function _nodesTransferExpression(nodelist){
	var newAstNodes;
	if (_.isString(nodelist)) {
		
		newAstNodes = [acorn.parseExpressionAt(nodelist)];
		
	}else{
		newAstNodes = _.map(nodelist.getNodes(),function(jsNode){
			return jsNode.astObj;
		})
	}
	return newAstNodes;
}
function _nodesTransferStatement(nodelist){
	var newAstNodes;
	if (_.isString(nodelist)) {
			newAstNodes = acorn.parse(nodelist, {
				ranges: true
			}).body;
	}else{
		newAstNodes = _.map(nodelist.getNodes(),function(jsNode){
			return jsNode.astObj;
		})
	}
	return newAstNodes;
}

function JsNode(astObj,parentJsNode) {
	var self = this;
	self.astObj = astObj;
	self.parentJsNode = parentJsNode || null;
}


JsNode.prototype.find = function(types, reg) {
	var self = this;
	var visitors = {};
	var results = [];

	if (!_.isArray(types)) types = [types];

	if (reg) {
		reg = _.isRegExp(reg) ? reg : new RegExp(reg);
	}

	var _exec = function(jsNode, st) {

		if (!reg) {
			results.push(jsNode);
		}else if (matchJsNode(jsNode, reg)) {
			results.push(jsNode);
		}
	}

	_.each(types, function(type) {
		visitors[type] = _exec;
	})

	walkAst(self.astObj, visitors);

	return results;

}


JsNode.prototype.replaceWith = function(nodelist) {
	var self = this;
	var curAstNode = self.astObj;
	var parentAstNode =  self.parentJsNode.astObj;

	var key = null;

	var comments = [];

	var returnNodes = null;
	//if (!key) return self;


	var newAstNodes = null;

	
	if(_isStatement(self)){
		newAstNodes = _nodesTransferStatement(nodelist);
	}else{
		newAstNodes = _nodesTransferExpression(nodelist);
	}
	// if(walk){
	// 	var tempAstNodes = [];
	// 	_.each(newAstNodes,function(astNode){
	// 		var findedJsNodes = new JsNode(astNode).find(curAstNode.type);
	// 		if(findedJsNodes.length > 0) tempAstNodes.push(findedJsNodes[0].astObj);
	// 	});
	// 	newAstNodes = tempAstNodes;
	// }
	 
	_.each(parentAstNode,function(v,k){
	 	if (_.isObject(v) && v == curAstNode) {
	 		key = k;
	 		parentAstNode[k] = newAstNodes[0];

	 		returnNodes = [new JsNode(newAstNodes[0],self.parentJsNode)];
	 	}

	 	if (_.isArray(v) &&  (key = _.indexOf(v,curAstNode)) != -1 ) {
	 		Array.prototype.splice.apply(v,[key,1].concat(newAstNodes));

	 		returnNodes = _.map(newAstNodes,function(statement){
	 			return new JsNode(statement,self.parentJsNode);
	 		});
	 	}
	})

	return returnNodes ? returnNodes : self;

}

JsNode.prototype.stringify = function() {

	return escodegen.generate(this.astObj, {
		comment: true
	});

}

JsNode.prototype.getCurrentStatement = function() {
	var state = this;
	var returnSt = null;
	while (state && state.astObj.type != 'Program') {

		if (_isStatement(state)) {
			returnSt = state;
			break;
		}

		state = state.parentJsNode;
	}
	return returnSt;

}


var methodFactory = (function(){

	var _append = function(nodelist){
		var curJsNode = this;
		var block = null;
		if (curJsNode.astObj.type=='IfStatement') {
			block = curJsNode.astObj.consequent;
		}else{
			block = curJsNode.astObj.body;
		}

		var newAstNodes = _nodesTransferStatement(nodelist);
		block.body = block.body.concat(newAstNodes);

		return curJsNode;

	}
	var _prepend = function(nodelist){
		var curJsNode = this;
		var block = null;
		if (curJsNode.astObj.type=='IfStatement') {
			block = curJsNode.astObj.consequent;
		}else{
			block = curJsNode.astObj.body;
		}

		var newAstNodes = _nodesTransferStatement(nodelist);
		block.body = newAstNodes.concat(block.body);

		return curJsNode;

	}

	var _insertBefore = function(nodelist){
		var curJsNode = this;
		var nodes = nodelist.getNodes();
		var statements,key;
		_.each(nodes,function(node){
			
			if (!_isStatement(node)) return;
			statements = node.parentJsNode.astObj.body;
			key = _.indexOf(statements,node.astObj);
			statements.splice(key,0,_.clone(curJsNode.astObj));

		})

	}
	var _insertAfter=function(nodelist){
		var curJsNode = this;
		var nodes = nodelist.getNodes();
		var statements,key;
		_.each(nodes,function(node){

			if (!_isStatement(node)) return;
			statements = node.parentJsNode.astObj.body;
			key = _.indexOf(statements,node.astObj);
			statements.splice(key+1,0,_.clone(curJsNode.astObj));

		})

	}

	var functionMethods = {
		getParam: function(index) {
			var curJsNode = this;
			var params = curJsNode.astObj.params;
			index = parseInt(index) || 0;

			if (index > params.length - 1) return [];

			if (index < 0) index = params.length + index;

			return new JsNode(params[index],curJsNode);

		},
		addParam:function(identifyName){
			var curJsNode = this;
			var params = curJsNode.astObj.params;
			var node = {
                "type": "Identifier",
                "name": identifyName
            };
			params.push(node);

			return curJsNode;
		},
		allParam:function(){
			var curJsNode = this;
			var params = curJsNode.astObj.params;
			return _.map(params,function(param){
				return new JsNode(param,curJsNode);
			})

		},
		append: _append,
		prepend: _prepend
	}

	var typeFunctionHash = {

		CallExpression:{
			get:function(index){
				var curJsNode = this;
				var params = curJsNode.astObj.arguments;
				index = parseInt(index);

				if (index > params.length - 1) return [];

				if (index < 0) index = params.length + index;

				return new JsNode(params[index],curJsNode);
			}
		},
		ObjectExpression:{
			get:function(key){
				var curJsNode = this;
				var properties = curJsNode.astObj.properties;
				var findedProtyAstNode = null;

				_.each(properties,function(pro){
					if (pro.key.name == key) {
						findedProtyAstNode = pro;
					}

				})

				if(!findedProtyAstNode) return [];

				return new JsNode(findedProtyAstNode.value,new JsNode(findedProtyAstNode,curJsNode)); 
			},
			add:function(key,nodelist){
				var curJsNode = this;
				var keyNode = _nodesTransferExpression(key)[0];
				var newAstNodes = _nodesTransferExpression(nodelist);
				var coneProperty = {
	                "type": "Property",
	                "key": keyNode,
	                "value": newAstNodes[0],
	                "kind": "init"
	            }

				curJsNode.astObj.properties.push(coneProperty);

				return new JsNode(coneProperty,curJsNode);
			},
			remove:function(key){
				var curJsNode = this;
				var pros = curJsNode.astObj.properties;
				var index = null;

				_.each(pros,function(pro,k){
					if (escodegen.generate(pro.key) == key) {
						index = k;
					}

				})

				if(index) curJsNode.astObj.properties.splice(index,1);

				return curJsNode;
			}

		},
		ArrayExpression:{
			get:function (index) {
				var curJsNode = this;
				var elements = curJsNode.astObj.elements;
				if (index > elements.length - 1) return [];

				if (index < 0) index = elements.length + index;

				return new JsNode(elements[index],curJsNode);				
			},
			splice:function(){
				var curJsNode = this;
				var elements = curJsNode.astObj.elements;
				var returnArgs = [];//
				var args = Array.prototype.slice.call(arguments);

				var leftArgs = args.slice(0,2);
				var rightArgs = args.slice(2);

				_.map(rightArgs,function(arg){
					returnArgs = returnArgs.concat(_nodesTransferExpression(arg));
				})

				returnArgs = leftArgs.concat(returnArgs);

				var returnAstNodes = Array.prototype.splice.apply(elements,returnArgs);

				return _.map(returnAstNodes,function(node){
		 			return new JsNode(node,curJsNode);
		 		});	
			},
			push:function(str){
				var returnAstNodes = _nodesTransferExpression(str);
				var curJsNode = this;
				var elements = curJsNode.astObj.elements;
				curJsNode.astObj.elements = elements.concat(returnAstNodes);

				return _.map(returnAstNodes,function(node){
		 			return new JsNode(node,curJsNode);
		 		});
			}
		},
		FunctionExpression:functionMethods,
		FunctionDeclaration:functionMethods,
		IfStatement:{
			append: _append,
			prepend: _prepend
		},
		ForStatement:{
			append: _append,
			prepend: _prepend
		},
		WhileStatement:{
			append: _append,
			prepend: _prepend
		}
	}

	_.each(typeFunctionHash,function(v,k){

		if(_isStatement(k)){
			v['insertBefore'] = _insertBefore;
			v['insertAfter'] = _insertAfter;
		}

		//为了节点上原型方法都可以被 节点list调用到
		//原型方法上基本都是通用方法
		_.extend(v,JsNode.prototype);

	})


	var returnObj = {};


	returnObj.getAllMethods = function(){
		var methods = [];

		_.each(typeFunctionHash,function(v){
			methods = methods.concat(_.keys(v));
		})
		methods = _.uniq(methods);

		return methods;
	}

	returnObj.getFn = function(jsNode,method){

		var type = jsNode.astObj.type;
		var methodsObj,methodFn;


		if(_.has(typeFunctionHash,type) && typeFunctionHash[type][method]) return typeFunctionHash[type][method];

		if(_.has(JsNode.prototype,method)) return JsNode.prototype[method];
		
		return false;
	}

	return returnObj;

})();

function proxy(method) {

	return function() {
		var self = this;
		var jsNodes = self.getNodes();
		var newJsNodes = [];
		var args = arguments;
		_.each(jsNodes, function(jsNode) {
			var returnNodes = null;
			var methodFn = null;

			methodFn = methodFactory.getFn(jsNode,method);
			if (!methodFn) return;

			returnNodes = methodFn.apply(jsNode, args);
			if(!returnNodes) return;

			returnNodes = _.isArray(returnNodes) ? returnNodes : [returnNodes];
			newJsNodes = newJsNodes.concat(returnNodes);

		})

		return new JsNodeList(newJsNodes);
	}


}

function JsNodeList(jsNodes) {
	var self = this;
	self.length = jsNodes.length;

	_.each(jsNodes, function(v, k) {
		self[k] = v;
	});

	var methods =_.difference(methodFactory.getAllMethods(),_.keys(JsNodeList.prototype));
	_.map(methods, function(method) {
		self[method] = proxy(method);
	})

}

JsNodeList.prototype.getNodes = function() {
	var self = this;
	if (self.length == 0) return [];

	var nodeArray = [];
	for (var i = self.length - 1; i >= 0; i--) {
		nodeArray.push(self[i])
	}
	return nodeArray;
}


JsNodeList.prototype.stringify = function() {

	var nodes = this.getNodes();
	var jsString = '';
	_.each(nodes, function(node) {
		jsString += node.stringify();
	})
	return jsString;
}


exports.transfer = function(jsString) {

	var comments = [];

	var newAstNode = acorn.parse(jsString, {
		ranges: true,
		onComment: comments
	});

	return new JsNodeList([new JsNode(newAstNode)]);

}


