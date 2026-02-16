const Cake = require('../models/Cake');
const multer = require("multer");
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"), false);
    }
  }
});


// Get all cakes
const getAllCakes = async (req, res) => {
  try {
    const cakes = await Cake.find().sort({ createdAt: -1 }); // ⭐ newest first;
    res.status(200).json(cakes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllCakes2 = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor;
    const query = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
    const cakes = await Cake.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)

    const hasNextPage = cakes.length > limit;
    if (hasNextPage) {
      cakes.pop();
    }
    console.log(cakes.length);
    res.status(200).json({
      data: cakes,
      nextCursor: hasNextPage ? cakes[cakes.length - 1].createdAt : null,
      message: "Cake Fetched Successfully!"
    })
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" })
  }
}

// Get single cake by ID
const getCakeById = async (req, res) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }
    res.status(200).json(cake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCakeBySlug = async (req, res) => {
  try {
    const cake = await Cake.findOne({ slug: req.params.slug });

    if (!cake) {
      return res.status(404).json({ message: "Cake not found" });
    }

    res.status(200).json(cake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCake = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Cake name is required" });
    }

    // 🟢 Generate slug safely
    let slug = generateSlug(name);

    const existingCake = await Cake.findOne({ slug });
    if (existingCake) {
      slug = `${slug}-${Date.now()}`;
    }

    // 🟢 Prepare safe body (prevent slug/image overwrite)
    const { slug: bodySlug, image: bodyImage, ...rest } = req.body;

    // 🟢 If image uploaded via multer → use full URL
    let imageUrl = "";
    if (req.file) {
      imageUrl = `https://egglesscake-backend.fly.dev/uploads/${req.file.filename}`;
    } 
    // 🟢 If no new image but frontend sent Firebase URL → allow it
    else if (bodyImage) {
      imageUrl = bodyImage;
    }

    const cake = new Cake({
      ...rest,
      slug,
      image: imageUrl,
    });

    const savedCake = await cake.save();

    res.status(201).json({
      success: true,
      message: "Cake created successfully",
      data: savedCake,
    });

  } catch (error) {
    console.error("Create Cake Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const createMultipleCakes = async (req, res) => {
  try {
    const cakes = req.body; // Assuming the request body contains an array of cakes
    for (let cake of cakes) {
      const slug = generateSlug(cake.name);
      cake.slug = slug;
    }
    const savedCakes = await Cake.insertMany(cakes);
    res.status(201).json(savedCakes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Update cake
const updateCake = async (req, res) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: "Cake not found" });
    }

    // 🟢 If name updated → regenerate slug
    if (req.body.name && req.body.name !== cake.name) {
      let newSlug = generateSlug(req.body.name);

      const existingCake = await Cake.findOne({ slug: newSlug });
      if (existingCake && existingCake._id.toString() !== cake._id.toString()) {
        newSlug = `${newSlug}-${Date.now()}`;
      }

      cake.slug = newSlug;
    }

    // 🟢 If new image uploaded → delete old image + save new one
    if (req.file) {

      // Delete old image ONLY if it is local upload
      if (cake.image && cake.image.includes("/uploads/")) {
        const filename = cake.image.split("/uploads/")[1];
        const oldImagePath = path.join(__dirname, "..", "uploads", filename);

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new full image URL
      cake.image = `https://egglesscake-backend.fly.dev/uploads/${req.file.filename}`;
    }


const { slug, image, ...rest } = req.body;
Object.assign(cake, rest);


    const updatedCake = await cake.save();

    res.status(200).json({
      success: true,
      message: "Cake updated successfully",
      data: updatedCake
    });

  } catch (error) {
    console.error("Update Cake Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


// Delete cake
const deleteCake = async (req, res) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    await cake.deleteOne();
    res.status(200).json({ message: 'Cake deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add review to cake
const addReview = async (req, res) => {
  console.log("Add Review Called with body:", req.body);
  console.log("Uploaded files:", req.params.id);
  try {
    const cake = await Cake.findOne({ slug: req.params.id });

    if (!cake) {
      return res.status(404).json({ message: "Cake not found" });
    }

    const { userName, rating, comment } = req.body;

    // ⭐ Validation
    if (!userName || !rating || !comment) {
      return res.status(400).json({
        message: "Name, rating and comment are required"
      });
    }

    // ⭐ Prevent duplicate review from same name (optional)
    const alreadyReviewed = cake.reviews.find(
      (r) => r.userName.toLowerCase() === userName.toLowerCase()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        message: "You already reviewed this cake"
      });
    }

    // ⭐ Get uploaded images from multer
    let reviewImages = [];
    if (req.files && req.files.length > 0) {
      reviewImages = req.files.map(file => file.path); 
      // If using Cloudinary use file.path or file.secure_url depending on config
    }

    // ⭐ Create review object
    const newReview = {
      userName,
      rating: Number(rating),
      comment,
      images: reviewImages,
      verifiedPurchase: false
    };

    // ⭐ Push review
    cake.reviews.push(newReview);

    // ⭐ Save (middleware auto calculates rating)
    await cake.save();

    res.status(201).json({
      message: "Review added successfully",
      averageRating: cake.averageRating,
      totalReviews: cake.totalReviews,
      reviews: cake.reviews
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getCakeByFlavor = async (req, res) => {
  const { flavor } = req.body;
  const limit = parseInt(req.body.query.limit) || 10;
  const cursor = query.cursor;
  const query = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
  try {
    const cakes = await Cake.find({ flavor: flavor && query })
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasNextPage = cakes.length > limit;
    if (hasNextPage) {
      cakes.pop();
    }

    res.status(200).json({
      cakes,
      nextCursor: hasNextPage ? cakes[cakes.length - 1].createdAt : null,
      message: "Cakes fetched successfully!"
    })
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" });
  }
}

module.exports = {
  getAllCakes,
  getAllCakes2,
  getCakeById,
  getCakeBySlug,
  createCake,
  createMultipleCakes,
  updateCake,
  deleteCake,
  addReview,
  upload
}; 