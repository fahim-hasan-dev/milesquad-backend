class QueryBuilder {
    queryModel: any;
    query: any;

    constructor(queryModel: any, query: Record<string, any>) {
        this.queryModel = queryModel;
        this.query = query;
    }

    search(searchableFields: string[]) {
       if(this?.query.searchTerm) {
        this.queryModel = this.queryModel.find({
            $or: searchableFields.map((field) => ({
                [field]: { $regex: this?.query?.searchTerm, $options: 'i' },
            })),
        });
       }
        return this;
    }

    filter(){
        const queryObj = { ...this.query };
        const excludedFields = ['page', 'limit','searchTerm'];
        excludedFields.forEach((el) => delete queryObj[el]);

        this.queryModel = this.queryModel.find(queryObj);
        return this;
    }

    paginate(){
        const page = Number(this.query.page) || 1;
        const limit = Number( this.query.limit) || 10;
        const skip = (page - 1) * limit;
        this.queryModel = this.queryModel.skip(skip).limit(limit);
        return this;    
    }

    async getPaginationInfo() {
        const total = await this.queryModel.model.countDocuments(this.queryModel.getQuery());
        const limit = Number( this.query.limit) || 10;
        const totalPage = Math.ceil(total / limit);
        const page = Number(this.query.page) || 1;
        
        return {
            total,
            totalPage,
            page,
            limit
        };
    }
}

export default QueryBuilder;
