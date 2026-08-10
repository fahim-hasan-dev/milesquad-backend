import express from "express";
import { createCategoryZod } from "./category.validation";
import { fileAndBodyProcessorUsingDiskStorage } from "../../middleware/processReqBody";
import validateRequest from "../../middleware/validateRequest";
import { categoryController } from "./category.controller";


const router = express.Router();

router.post("/create",
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(createCategoryZod),
    categoryController.createCategory);
router.get("/", categoryController.getAllCategories);
router.patch("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);


export const CategoryRoutes = router;
