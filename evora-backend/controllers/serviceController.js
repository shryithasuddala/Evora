const Service = require("../models/Service");

// @desc    Create service
// @route   POST /api/services
// @access  Private (vendor)
exports.createService = async (req, res, next) => {
  try {
    const { name, category, price, unit, location, duration, description, tags } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ success: false, message: "name, category, and price are required." });
    }
    const service = await Service.create({
      vendorId: req.user._id,
      name, category, price: Number(price), unit, location, duration, description,
      tags: Array.isArray(tags) ? tags : [],
    });
    res.status(201).json({ success: true, service });
  } catch (err) { next(err); }
};

// @desc    Get all active services (for browse) or vendor's own services
// @route   GET /api/services
// @access  Private
exports.getServices = async (req, res, next) => {
  try {
    let filter = { isActive: true };
    // Vendor sees only their own; others see all active
    if (req.user.role === "vendor") filter.vendorId = req.user._id;
    if (req.query.vendorId) filter.vendorId = req.query.vendorId;
    if (req.query.category) filter.category = req.query.category;

    const services = await Service.find(filter).populate("vendorId", "fullName businessName email phone location").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: services.length, services });
  } catch (err) { next(err); }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Private
exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate("vendorId", "fullName businessName email");
    if (!service) return res.status(404).json({ success: false, message: "Service not found." });
    res.status(200).json({ success: true, service });
  } catch (err) { next(err); }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (vendor)
exports.updateService = async (req, res, next) => {
  try {
    let service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found." });
    if (String(service.vendorId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    const allowed = ["name","category","price","unit","location","duration","description","tags","isActive"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    service = await Service.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, service });
  } catch (err) { next(err); }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (vendor)
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found." });
    if (String(service.vendorId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    await service.deleteOne();
    res.status(200).json({ success: true, message: "Service deleted." });
  } catch (err) { next(err); }
};
