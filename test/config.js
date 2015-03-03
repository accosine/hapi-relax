module.exports = {
  'plugins': {
    'a': [
      {
        'register': require('../index'),
        'options': {
          'nano': {
            'url': 'http://localhost:5984',
            'db': 'alice'
          },
          'user': 'root',
          'password': 'asdf'
        }
      },
      {
        'register': require('../index'),
        'options': {
          'nano': {
            'url': 'http://localhost:5984',
            'db': 'test'
          },
          'user': 'root',
          'password': 'asdf',
          'prefix': 'customPrefix'
        }
      }
    ],
    'b': [
      {
        'register': require('../index'),
        'options': {
          'nano': {
            'url': 'http://localhost:5984',
            'db': 'test2'
          },
          'user': 'root',
          'password': 'asdf',
          'prefix': 'customPrefix'
        }
      }
    ],
    'c': [
      {
        'register': require('../index'),
        'options': {
          'nano': {
            'url': 'http://localhost:5984',
            'db': 'test2'
          },
          'user': 'root',
          'password': 'wrong',
          'prefix': 'customPrefix'
        }
      }
    ]
  }
};
