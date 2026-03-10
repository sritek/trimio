/**
 * Customers Controller
 * Request handlers for customer management
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  successResponse,
  paginatedResponse,
  deleteResponse,
  buildPaginationMeta,
} from '../../lib/response';
import { customersService, maskPhone } from './customers.service';

import type {
  CreateCustomerBody,
  UpdateCustomerBody,
  UpdateCustomerPhoneBody,
  CustomerQuery,
  CustomerSearchQuery,
  CreateNoteBody,
  NotesQuery,
} from './customers.schema';

// Roles that should see masked phone numbers
const MASKED_PHONE_ROLES = ['stylist'];

export class CustomersController {
  /**
   * Get all customers with pagination and filtering
   */
  async getCustomers(request: FastifyRequest<{ Querystring: CustomerQuery }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const result = await customersService.getCustomers(tenantId, request.query);

    // Mask phone numbers for stylists
    const data = MASKED_PHONE_ROLES.includes(request.user.role)
      ? result.data.map((c) => ({ ...c, phone: maskPhone(c.phone) }))
      : result.data;

    return reply.send(
      paginatedResponse(data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Search customers (quick lookup)
   */
  async searchCustomers(
    request: FastifyRequest<{ Querystring: CustomerSearchQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const customers = await customersService.searchCustomers(tenantId, request.query);

    // Mask phone numbers for stylists
    const data = MASKED_PHONE_ROLES.includes(request.user.role)
      ? customers.map((c) => ({ ...c, phone: maskPhone(c.phone) }))
      : customers;

    return reply.send(successResponse(data));
  }

  /**
   * Get a single customer by ID
   */
  async getCustomerById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, role } = request.user;
    const isStylist = MASKED_PHONE_ROLES.includes(role);

    const customer = await customersService.getCustomerById(tenantId, request.params.id, {
      includeNotes: !isStylist,
    });

    if (!customer) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Customer not found'));
    }

    // Mask phone for stylists
    const data = isStylist
      ? { ...customer, phone: maskPhone(customer.phone), email: undefined }
      : customer;

    return reply.send(
      successResponse({
        ...data,
        hasAllergyWarning: customer.allergies.length > 0,
      })
    );
  }

  /**
   * Create a new customer
   */
  async createCustomer(request: FastifyRequest<{ Body: CreateCustomerBody }>, reply: FastifyReply) {
    const { tenantId, sub, branchIds } = request.user;

    const customer = await customersService.createCustomer(
      tenantId,
      request.body,
      branchIds?.[0], // Use first branch as first visit branch
      sub
    );

    return reply.code(201).send(successResponse(customer));
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCustomerBody }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const customer = await customersService.updateCustomer(
      tenantId,
      request.params.id,
      request.body,
      sub
    );

    return reply.send(successResponse(customer));
  }

  /**
   * Update customer phone number (manager only)
   */
  async updateCustomerPhone(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCustomerPhoneBody }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const customer = await customersService.updateCustomerPhone(
      tenantId,
      request.params.id,
      request.body.phone,
      request.body.reason,
      sub
    );

    return reply.send(successResponse(customer));
  }

  /**
   * Delete (deactivate) a customer
   */
  async deleteCustomer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    await customersService.deleteCustomer(tenantId, request.params.id, sub);

    return reply.send(deleteResponse('Customer deactivated successfully'));
  }

  /**
   * Reactivate a customer
   */
  async reactivateCustomer(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const customer = await customersService.reactivateCustomer(tenantId, request.params.id, sub);

    return reply.send(successResponse(customer));
  }

  /**
   * Unblock customer from booking restrictions
   */
  async unblockCustomer(
    request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const customer = await customersService.unblockCustomer(
      tenantId,
      request.params.id,
      request.body.reason,
      sub
    );

    return reply.send(successResponse(customer));
  }

  /**
   * Get customer notes
   */
  async getCustomerNotes(
    request: FastifyRequest<{ Params: { id: string }; Querystring: NotesQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const result = await customersService.getCustomerNotes(
      tenantId,
      request.params.id,
      request.query
    );

    return reply.send(
      paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Add a note to customer
   */
  async addCustomerNote(
    request: FastifyRequest<{ Params: { id: string }; Body: CreateNoteBody }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const note = await customersService.addCustomerNote(
      tenantId,
      request.params.id,
      request.body,
      sub
    );

    return reply.code(201).send(successResponse(note));
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const stats = await customersService.getCustomerStats(tenantId, request.params.id);

    return reply.send(successResponse(stats));
  }
}

export const customersController = new CustomersController();
