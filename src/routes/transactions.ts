import { FastifyInstance } from "fastify"
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from "../database"
import { checkSessionIdExists } from "../middlewares/check-session-id-exists"

export async function transactionsRoutes(app: FastifyInstance) {

    // Listar todas as transações
    app.get('/', {preHandler: [checkSessionIdExists]}, async (request, reply) => {

        const { sessionId } = request.cookies

        const transactions = await knex('transactions')
            .where('session_id', sessionId)
            .select()
        
        return {
            transactions
        }
    })

    // Detalhar de uma única transação
    app.get('/:id', {preHandler: [checkSessionIdExists]}, async (request) => {
        const getTransactionsParamsSchema = z.object({
            id: z.string().uuid(),
        })

        const { id } = getTransactionsParamsSchema.parse(request.params)

        const { sessionId } = request.cookies

        const transaction = await knex('transactions')
            .where({
                session_id: sessionId,
                id: id,
            }).first()

        return {
            transaction
        }

    })

    // Resumir as transações
    app.get('/summary', {preHandler: [checkSessionIdExists]}, async (request) => {

        const { sessionId } = request.cookies

        const summary = await knex('transactions')
            .where('session_id', sessionId)
            .sum('amount', { as: 'amount'})
            .first()

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