require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.deftcj8.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('bisstroDB').collection('users');
    const menuCollection = client.db('bisstroDB').collection('menu');
    const reviewCollection = client.db('bisstroDB').collection('reviews');
    const cartCollection = client.db('bisstroDB').collection('cart');

    //menu related api
    app.get('/menu', async (req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    });
    

    //review related api
    app.get('/reviews', async (req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    });

    //jwt related api
    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
    });

    //verify jwt
    const verifyToken = (req, res, next) => {
        console.log('token inside verifyToken', req.headers.authorization);
        const authorization = req.headers.authorization;
        if (!authorization) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        const token = authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            req.decoded = decoded;
            next();
        });
    };

    //user related api
    app.get('/users', verifyToken, async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
    });

    //check admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
        const email = req.params.email;
        if (req.decoded.email !== email) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user?.role === 'admin') {
            admin = true;
        }
        res.send({ admin });
    });

    app.post('/users', async (req, res) => {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
            return res.send({ message: 'User already exists' });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
            $set: {
                role: 'admin'
            }
        };
        const result = await userCollection.updateOne(query, updatedDoc);
        res.send(result);
    });


    //cart related api

    app.get('/carts', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
    });

    app.post('/carts', async (req, res) => {
        const item = req.body;
        console.log(item);
        const result = await cartCollection.insertOne(item);
        res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await cartCollection.deleteOne(query);
        res.send(result);
    });
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Boss is running');
});
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});