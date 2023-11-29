const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const path = require('path');
const app = express();
const port = 8080;

const db = mysql.createConnection({
  host: 'localhost',              // MySQL 호스트 이름
  user: 'root',   // MySQL 사용자 이름
  password: 'root', // MySQL 비밀번호
  database: 'communityDB',       // MySQL 데이터베이스 이름
});

db.connect((err) => {
  if (err) {
    console.error('MySQL 연결 오류:', err);
  } else {
    console.log('MySQL과 연결되었습니다.');
  }
});

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: '1', 
    resave: false,
    saveUninitialized: true,
  })
);

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});



app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/process/signup', (req, res) => {
  const { username, pwd, email, gender } = req.body;
  // 아이디 중복 확인
  const checkDuplicateQuery = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
  db.query(checkDuplicateQuery, [username], (duplicateErr, duplicateResults) => {
    if (duplicateErr) {
      console.error('아이디 중복 확인 오류:', duplicateErr);
      res.send('회원가입 중 오류가 발생했습니다.');
    } else {
      const duplicateCount = duplicateResults[0].count;
      if (duplicateCount > 0) {
        res.send('이미 사용 중인 아이디입니다.');
      } else {
        // 중복되지 않은 경우 회원가입 진행
        const user = {
          username,
          pwd,
          email,
          gender,
        };
        const query = 'INSERT INTO users (username, pwd, email, gender) VALUES (?, ?, ?, ?)';
        const values = [user.username, user.pwd, user.email, user.gender];
    
        db.query(query, values, (err) => {
          if (err) {
            console.error('사용자 추가 오류:', err);
            res.send('회원가입에 실패했습니다.');
          } else {
            res.send('회원가입이 완료되었습니다.');
            res.redirect('/');
          }
          
        });
      }
    }
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, pwd } = req.body;

  const query = 'SELECT * FROM users WHERE username = ? AND pwd = ?';
  const values = [username, pwd];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('로그인 오류:', err);
      res.send('로그인에 실패했습니다.');
    } else {
      if (results.length > 0) {
        const user = results[0];
        // 로그인 성공 시 세션에 사용자 정보를 저장
        req.session.user = user;
        res.redirect('/');
      } else {
        res.send('잘못된 사용자 이름 또는 비밀번호입니다.');
      }
    }
  });
});
app.get('/board', (req, res) => {
  if (req.session.user) {
    // 여기서 데이터베이스 쿼리를 사용하여 게시물 목록을 가져와서 posts 변수에 할당
    db.query('SELECT * FROM posts', (err, results) => {
      if (err) {
        console.error('게시물 가져오기 오류:', err);
        // 에러 처리
        return res.status(500).send('게시물을 가져오는 도중 오류가 발생했습니다.');
      }
      const posts = results;
      res.render('board', { user: req.session.user, posts });
    });
  } else {
    res.redirect('/login');
  }
});


app.get('/logout', (req, res)=> {
  req.session.destroy((err) => {
    if (err) {
      console.error('세션 파기 오류:', err);
      return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
    }
    // 로그아웃 성공 시 홈페이지로 리다이렉트
    res.redirect('/');
  });
});

app.get('/write', (req, res) => {

  if (!req.session.user) {
    
    res.redirect('/login');
  } else {
    res.render('write');
  }
});

app.post('/write', (req, res) => {
  const { title, content } = req.body;
  const userId = req.session.user.id; 
  const query = 'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)';
  const values = [title, content, userId];

  db.query(query, values, (err) => {
    if (err) {
      console.error('게시글 저장 오류:', err);
      res.send('게시글 저장에 실패했습니다.');
    } else {
      res.send('게시글이 저장되었습니다.');
    }
  });
});
app.get('/post/:postId', (req, res) => {
  const postId = req.params.postId;

  // 데이터베이스 쿼리를 사용하여 postId에 해당하는 게시물을 가져오는 예시
  db.query('SELECT * FROM posts WHERE id = ?', [postId], (err, results) => {
    if (err) {
      console.error('게시물 가져오기 오류:', err);
      // 에러 처리
      return res.status(500).send('게시물을 가져오는 도중 오류가 발생했습니다.');
    }

    if (results.length === 0) {
      // 해당 ID의 게시물이 없을 경우
      return res.status(404).send('게시물을 찾을 수 없습니다.');
    }

    const retrievedPostData = results[0]; // retrievedPostData를 정의 및 할당
    res.render('post', { post: retrievedPostData });
  });
});
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

