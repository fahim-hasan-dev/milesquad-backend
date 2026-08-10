import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IContact, IFaq, IPublic } from './public.interface'
import { Contact, Faq, Public } from './public.model'
import { User } from '../../../app/modules/user/user.model'
import { emailHelper } from '../../../helpers/emailHelper'
import QueryBuilder from '../../builder/QueryBuilder'
import { emailTemplate } from '../../../shared/emailTemplate'

const createPublic = async (payload: IPublic) => {
  const isExist = await Public.findOne({
    type: payload.type,
  })
  if (isExist) {
    await Public.findByIdAndUpdate(
      isExist._id,
      {
        $set: {
          content: payload.content,
        },
      },
      {
        new: true,
      },
    )
  } else {
    const result = await Public.create(payload)
    if (!result)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Public')
  }

  return `${payload.type} created successfully}`
}

const getAllPublics = async (
  type: 'privacy-policy' | 'terms-and-condition',
) => {
  const result = await Public.findOne({ type: type }).lean()
  return result || null
}

const deletePublic = async (id: string) => {
  const result = await Public.findByIdAndDelete(id)
  return result
}

const createContact = async (payload: IContact) => {
  try {
    // Find admin user to send notification
    const admin = await User.findOne({ role: 'admin' })

    if (!admin || !admin.email) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Admin user not found',
      )
    }

    const result = await Contact.create(payload)
    if (!result)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Contact')
    setTimeout(() => {
      // send admin email
      emailHelper.sendEmail(
        emailTemplate.adminContactNotificationEmail(payload),
      )
      // send user email
      emailHelper.sendEmail(emailTemplate.userContactConfirmationEmail(payload))
    }, 0)

    return {
      message: 'Contact form submitted successfully',
    }
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to submit contact form',
    )
  }
}

const getAllContacts = async (query: Record<string, unknown>) => {
  const contactQueryBuilder = new QueryBuilder(Contact.find(), query)

  contactQueryBuilder.paginate()

  const result = await contactQueryBuilder.modelQuery.lean()

  // Get pagination info separately
  const paginationResult = await contactQueryBuilder.getPaginationInfo()

  // Return clean objects without circular references
  return {
    meta: paginationResult,
    result,
  }
}

const createFaq = async (payload: IFaq) => {
  const result = await Faq.create(payload)
  if (!result)
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Faq')
  return result
}

const getAllFaqs = async () => {
  const result = await Faq.find({})
  return result || []
}

const getSingleFaq = async (id: string) => {
  const result = await Faq.findById(id)
  return result || null
}

const updateFaq = async (id: string, payload: Partial<IFaq>) => {
  const isExist = await Faq.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Faq not found')
  }
  const result = await Faq.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      new: true,
    },
  )
  return result
}

const deleteFaq = async (id: string) => {
  const isExist = await Faq.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Faq not found')
  }
  const result = await Faq.findByIdAndDelete(id)
  return result
}

export const PublicServices = {
  createPublic,
  getAllPublics,
  deletePublic,
  createContact,
  createFaq,
  getAllFaqs,
  getSingleFaq,
  updateFaq,
  deleteFaq,
  getAllContacts,
}
