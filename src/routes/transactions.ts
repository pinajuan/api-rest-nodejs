import { FastifyInstance } from "fastify"
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from "../database"

export async function transactionsRoutes(app: FastifyInstance) {

    // Listar todas as transações
    app.get('/', async () => {
        const transactions = await knex('transactions').select()
        return {
            transactions
        }
    })

    // Detalhar de uma única transação
    app.get('/:id', async (request) => {
        const getTransactionsParamsSchema = z.object({
            id: z.string().uuid(),
        })

        const { id } = getTransactionsParamsSchema.parse(request.params)

        const transaction = await knex('transactions').where('id', id).first()

        return {
            transaction
        }

    })

    // Resumir as transações
    app.get('/summary', async () => {
        const summary = await knex('transactions').sum('amount', { as: 'amount'}).first()
        return {
            summary
        }
    })

    // Criar transação
    app.post('/', async (request, reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit']),
        })

        const { title, amount, type } = createTransactionBodySchema.parse(request.body)

        let sessionId = request.cookies.sessionId

        if (!sessionId) {
            sessionId = randomUUID()
            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            })
        }

        await knex('transactions').insert({
            id: randomUUID(),
            title,
            amount: type === 'credit' ? amount : amount * -1,
            session_id: sessionId,
        })

        return reply.status(201).send()
    })
}