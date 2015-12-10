var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = process.env.PORT || 3000;
var todoNextId = 1;
var todos = [];

app.use(bodyParser.json())

app.get('/', function(req, res) {
	res.send('Todo API root');
});

app.get('/todos', middleware.requireAuthentication, function(req, res) {
	var query = req.query;
	var where = {
		userId: req.user.get('id')
	};

	if (query.hasOwnProperty('completed') && query.completed === 'true') {
		where.completed = true;
	} else if (query.hasOwnProperty('completed') && query.completed === 'false') {
		where.completed = false;
	}

	if (query.hasOwnProperty('q') && query.q.length > 0) {
		where.description = {
			$like: '%' + query.q + '%'
		};
	}

	db.todo.findAll({
		where: where
	}).then(function(todos) {
		return res.json(todos)
	}, function(e) {
		return res.status(500).json(e)
	});
});

app.get('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var where = {
		userId: req.user.get('id'),
		id: todoId
	};

	db.todo.findOne({
		where: where
	}).then(function(todo) {
		if (!!todo) {
			return res.json(todo.toJSON())
		} else {
			return res.status(404).send()
		}
	}, function(e) {
		return res.status(500).json(e)
	});
});

app.delete('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	db.todo.destroy({
		where: {
			userId: req.user.get('id'),
			id: todoId
		}
	}).then(function(rowsDeleted) {
		if (rowsDeleted) {
			return res.status(204).send();
		} else {
			return res.status(404).json({
				error: 'No todo with that ID'
			});
		}
	}, function(e) {
		return res.status(404).json(e)
	});
});

app.put('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var body = _.pick(req.body, 'description', 'completed')
	var attributes = {};
	var where = {
		userId: req.user.get('id'),
		id: todoId
	};

	if (body.hasOwnProperty('completed')) {
		attributes.completed = body.completed;
	}

	if (body.hasOwnProperty('description')) {
		attributes.description = body.description;
	}

	db.todo.findOne({
		where: where
	}).then(function(todo) {
		if (todo) {
			todo.update(attributes).then(function(todo) {
				res.json(todo.toJSON());
			}, function(e) {
				return res.status(400).send(e);
			});
		} else {
			res.status(404).send();
		}
	}, function(e) {
		return res.status(500).send();
	});
});

app.post('/todos', middleware.requireAuthentication, function(req, res) {
	var body = _.pick(req.body, 'description', 'completed')

	db.todo.create(body).then(function(todo) {
		req.user.addTodo(todo).then(function(todo) {
			return todo.reload();
		}).then(function(todo) {
			res.json(todo.toJSON())
		});
	}, function(e) {
		return res.status(400).json(e)
	});
});

app.post('/users', function(req, res) {
	var body = _.pick(req.body, 'email', 'password')

	db.user.create(body).then(function(user) {
		res.json(user.toPublicJSON())
	}, function(e) {
		res.status(400).json(e)
	});
});

app.post('/users/login', function(req, res) {
	var body = _.pick(req.body, 'email', 'password');
	var userInstance;

	db.user.authenticate(body).then(function(user) {
		var token = user.generateToken('authentication')
		userInstance = user;
		return db.token.create({
			token: token
		});
	}).then(function(tokenInstance) {
		res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
	}, function() {
		res.status(401).send();
	});
});

app.delete('/users/login', middleware.requireAuthentication, function(req, res) {
	req.token.destroy().then(function() {
		res.status(204).send();
	}, function() {
		res.status(500).send();
	});
});


db.sequelize.sync().then(function() {
	app.listen(PORT, function() {
		console.log('Express listening on port ' + PORT + '!');
	});
});