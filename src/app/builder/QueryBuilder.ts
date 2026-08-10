import { FilterQuery, Query, PopulateOptions } from 'mongoose'

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>
  public query: Record<string, unknown>

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery
    this.query = query
  }

  // Searching
  search(searchableFields: string[]) {
    if (this?.query?.searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          field =>
            ({
              [field]: {
                $regex: this.query.searchTerm,
                $options: 'i',
              },
            }) as FilterQuery<T>,
        ),
      })
    }
    return this
  }

// Filtering
filter() {
  const queryObj = { ...this.query }
  const excludeFields = [
    'searchTerm',
    'sort',
    'page',
    'limit',
    'fields',
    'withLocked',
    'showHidden',
    'download',
  ]
  excludeFields.forEach(el => delete queryObj[el])

  const filters: Record<string, any> = cleanObject(queryObj)

  this.modelQuery = this.modelQuery.find(filters as FilterQuery<T>)
  return this
}



  // Sorting
  sort() {
    let sort = (this?.query?.sort as string) || '-createdAt'
    this.modelQuery = this.modelQuery.sort(sort)
    return this
  }

  // Pagination
  paginate() {
    let limit = Number(this?.query?.limit) || 10
    let page = Number(this?.query?.page) || 1
    let skip = (page - 1) * limit

    this.modelQuery = this.modelQuery.skip(skip).limit(limit)
    return this
  }

  // Fields filtering
  fields() {
    let fields = (this?.query?.fields as string)?.split(',').join(' ') || '-__v'
    this.modelQuery = this.modelQuery.select(fields)
    return this
  }

  // Populating (flat + nested supported)
  populate(
    populateFields: (string | PopulateOptions)[],
    selectFields: Record<string, unknown> = {},
  ) {
    this.modelQuery = this.modelQuery.populate(
      populateFields.map(field =>
        typeof field === 'string'
          ? { path: field, select: selectFields[field] }
          : field,
      ),
    )
    return this
  }

  // Pagination info
  async getPaginationInfo() {
    const total = await this.modelQuery.model.countDocuments(
      this.modelQuery.getFilter(),
    )
    const limit = Number(this?.query?.limit) || 10
    const page = Number(this?.query?.page) || 1
    const totalPage = Math.ceil(total / limit)

    return {
      total,
      limit,
      page,
      totalPage,
    }
  }
}

function cleanObject(obj: Record<string, any>) {
  const cleaned: Record<string, any> = {}
  for (const key in obj) {
    const value = obj[key]
    if (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      value !== 'undefined' &&
      !(Array.isArray(value) && value.length === 0) &&
      !(
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      )
    ) {
      cleaned[key] = value
    }
  }
  return cleaned
}

export default QueryBuilder
