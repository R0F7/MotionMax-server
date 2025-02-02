const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
    ],
    credentials: true,
    optionSuccessStatus: 200,
}

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

//middleware 
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.wezoknx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const usersCollection = client.db('motionMaxDB').collection('users')
        const sliderCollection = client.db('motionMaxDB').collection('slider')
        const servicesCollection = client.db('motionMaxDB').collection('services')
        const testimonialsCollection = client.db('motionMaxDB').collection('testimonials')
        const featuredVehiclesCollection = client.db('motionMaxDB').collection('featuredVehicles')
        const partnersCollection = client.db('motionMaxDB').collection('partners')
        const workSheetCollection = client.db('motionMaxDB').collection('workSheet')
        const paymentsCollection = client.db('motionMaxDB').collection('payments')
        const messagesCollection = client.db('motionMaxDB').collection('messages')

        // Verify Token Middleware
        const verifyToken = async (req, res, next) => {
            const token = req.cookies?.token
            // console.log(token)

            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    console.log(err)
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.user = decoded
                //   console.log('in verify',req.user);
                next()
            })
        }

        const verifyEmployee = async (req, res, next) => {
            const email = req.user.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isEmployee = user?.role === 'Employee'
            if (!isEmployee) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        const verifyHR = async (req, res, next) => {
            const email = req.user.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isHR = user?.role === 'HR'
            if (!isHR) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.user.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'Admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        //user related api

        app.get('/users/employee/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log(email);

            if (email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let employee = false
            if (user) {
                employee = user?.role === 'Employee'
            }
            res.send({ employee })
        })

        app.get('/users/HR/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log(email);

            if (email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let HR = false
            if (user) {
                HR = user?.role === 'HR'
            }
            res.send({ HR })
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log('lklklk',req.user.email);

            if (email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'Admin'
            }
            res.send({ admin })
        })

        app.get('/all-employee', verifyToken, verifyAdmin, async (req, res) => {
            const filter = { role: { $ne: 'Admin' }, isVerified: true };
            const result = await usersCollection.find(filter).toArray()
            res.send(result)
        })

        app.patch('/increasing-salary/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email
            const salary = req.body.value
            console.log(salary);
            const filter = { email: email }
            const updatedDoc = {
                $set: {
                    salary: salary
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/all-employee/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'HR'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/all-employee-fired/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    isFired: true
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        app.get('/fired-users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const filter = { role: 'Employee' }
            const result = await usersCollection.find(filter).toArray()
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query)

            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }

            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        //For Employee
        app.get('/work-sheet', verifyToken, verifyEmployee, async (req, res) => {
            const { email } = req.query
            const result = await workSheetCollection.find({ user_email: email }).sort({ createAt: -1 }).toArray()
            res.send(result)
        })

        app.get('/progress-work', verifyToken, async (req, res) => {
            // const { email } = req.query
            const result = await workSheetCollection.find().sort({ createAt: -1 }).toArray()
            res.send(result)
        })

        app.post('/work-sheet', async (req, res) => {
            const doc = req.body
            const result = await workSheetCollection.insertOne(doc)
            res.send(result)
        })

        app.get('/all-info/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const payments = await paymentsCollection.find(query).sort({ month: 1 }).toArray()
            res.send({ user, payments })
        })

        app.patch('/verify/:id', verifyToken, verifyHR, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    isVerified: true,
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.get('/work-sheets', async (req, res) => {
            const { employeeName, month } = req.query;
            // console.log(employeeName, month);

            let query = {};

            if (employeeName) {
                const user = await usersCollection.findOne({ name: employeeName });
                if (user) {
                    query.user_email = user.email;
                }
            }

            if (month) {
                query.date = { $regex: `^${parseInt(month)}/` };
            }

            const result = await workSheetCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/message', async (req, res) => {
            const result = await messagesCollection.find().toArray()
            res.send(result)
        })

        app.post('/message', async (req, res) => {
            const info = req.body
            const result = await messagesCollection.insertOne(info)
            res.send(result)
        })


        //payment 
        app.post('/create-payment-intent', async (req, res) => {
            const { salary } = req.body;
            const amount = parseInt(salary * 100);
            // console.log(amount, 'amount inside the intent');

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })

        })

        app.get('/payment-history/:email', verifyToken, verifyEmployee, async (req, res) => {
            const email = req.params.email;
            console.log(email);

            if (email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const result = await paymentsCollection.find(query).sort({ month: -1 }).toArray()
            res.send(result)
        })

        app.get('/payments', verifyToken, verifyHR, async (req, res) => {
            const result = await paymentsCollection.find().toArray()
            res.send(result)
        })

        app.post('/payments', async (req, res) => {
            const paymentInfo = req.body
            const result = await paymentsCollection.insertOne(paymentInfo)
            res.send(result)
        })

        //slider api
        app.get('/slider', async (req, res) => {
            const result = await sliderCollection.find().toArray()
            res.send(result)
        })

        //services api
        app.get('/services', async (req, res) => {
            const result = await servicesCollection.find().toArray()
            res.send(result)
        })

        //featuredVehicles api
        app.get('/featuredVehicles', async (req, res) => {
            const result = await featuredVehiclesCollection.find().toArray()
            res.send(result)
        })

        //partners api
        app.get('/partners', async (req, res) => {
            const result = await partnersCollection.find().toArray()
            res.send(result)
        })

        //testimonials api
        app.get('/testimonials', async (req, res) => {
            const result = await testimonialsCollection.find().toArray()
            res.send(result)
        })

        //auth related api
        // creating Token
        app.post("/jwt", async (req, res) => {
            const user = req.body.email;
            // console.log("user for token", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

            res.cookie("token", token, cookieOptions).send({ success: true });
        });

        //clearing Token
        app.post("/logout", async (req, res) => {
            const user = req.body.email;
            console.log("logging out", user);
            res
                .clearCookie("token", { ...cookieOptions, maxAge: 0 })
                .send({ success: true })
        });

        // app.post('/jwt', async (req, res) => {
        //     const user = req.body
        //     console.log('user for token', user);

        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        //     res
        //         .cookie('token', token, cookieOptions)
        //         .send({ success: true })
        // })

        // app.post('/logout', async (req, res) => {
        //     const user = req.body;
        //     console.log('logging out', user);
        //     res.clearCookie('token', { ...cookieOptions, maxAge: 0 }).send({ success: true })
        // })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('MotionMax Abi v Zinnda Hai')
})

app.listen(port, () => {
    console.log(`MotionMax chal raha hai apni joss main on port:${port}`);
})