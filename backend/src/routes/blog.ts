import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify,jwt } from 'hono/jwt'
import { createPostInput, updatePostInput } from '@shivdev/instawrite-common';


export const blogRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string,
		JWT_SECRET: string,
	},
    Variables : {
		userId: string
	}
}>();

blogRouter.use("/*", async (c,next)=>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL 	,
    }).$extends(withAccelerate());

    const jwt = c.req.header('Authorization');
	if (!jwt) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
	const token = jwt.split(' ')[1]
	const payload = await verify(token, c.env.JWT_SECRET);
	if (!payload) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
	c.set('userId', payload.id);
	await next()
})

blogRouter.post('/', async (c) => {

    const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL
	}).$extends(withAccelerate());
    
	const body = await c.req.json();
	const { success } = createPostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}
	const post = await prisma.blog.create({
		data: {
			title: body.title,
			content: body.content,
			authorId: userId
		}
	});
	return c.json({
		id: post.id
	});
})

blogRouter.put('/', async (c) => {
    const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const { success } = updatePostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}
	prisma.blog.update({
		where: {
			id: body.id,
			authorId: userId
		},
		data: {
			title: body.title,
			content: body.content
		}
	});

	return c.text('updated post');
})


blogRouter.get('/', async (c) => {
    const body = await c.req.json()
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL
	}).$extends(withAccelerate());
	
	const post = await prisma.blog.findUnique({
		where: {
			id : body.id
		}
	});

	return c.json(post);
})

blogRouter.get('/bulk', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL
	}).$extends(withAccelerate());
	
	const blogs = await prisma.blog.findMany()

	return c.json(blogs);
})

 


