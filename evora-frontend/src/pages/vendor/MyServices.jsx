import { useState, useEffect } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  MapPin,
  IndianRupee,
  Clock,
  X,
  PackageOpen,
} from "lucide-react";
import { servicesAPI } from "../../services/api";

const MyServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    priceType: "Starting From",
    description: "",
    location: "",
    serviceArea: "",
    availability: "Available",
    duration: "",
  });

  const loadServices = async () => {
    try {
      const data = await servicesAPI.getAll();
      setServices(data || []);
    } catch (err) {
      console.error("Failed to load services:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      price: "",
      priceType: "Starting From",
      description: "",
      location: "",
      serviceArea: "",
      availability: "Available",
      duration: "",
    });
    setEditingService(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || "",
      category: service.category || "",
      price: service.price ? String(service.price) : "",
      priceType: service.priceType || "Starting From",
      description: service.description || "",
      location: service.location || "",
      serviceArea: service.serviceArea || "",
      availability: service.availability || "Available",
      duration: service.duration || "",
    });
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.category.trim() ||
      !formData.price.trim() ||
      !formData.location.trim()
    ) {
      alert("Please fill in Service Name, Category, Price and Location.");
      return;
    }

    try {
      if (editingService) {
        const id = editingService._id || editingService.id;
        await servicesAPI.update(id, {
          ...formData,
          price: Number(formData.price),
        });
      } else {
        await servicesAPI.create({
          ...formData,
          price: Number(formData.price),
        });
      }

      await loadServices();
      setShowForm(false);
      resetForm();
    } catch (err) {
      alert(err.message || "Operation failed.");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this service?"
    );
    if (confirmed) {
      try {
        await servicesAPI.remove(id);
        await loadServices();
      } catch (err) {
        alert(err.message || "Failed to delete service.");
      }
    }
  };

  return (
    <div className="vendor-page">
      {/* ================= HEADER ================= */}
      <div className="vendor-page-header">
        <div>
          <span className="vendor-page-label">CATALOG MANAGEMENT</span>
          <h1>My Services</h1>
          <p>
            Create, update, and showcase your professional event offerings.
          </p>
        </div>

        <button className="vendor-primary-button" onClick={handleOpenAdd}>
          <Plus size={18} />
          Add Service
        </button>
      </div>

      {/* ================= MODAL FORM ================= */}
      {showForm && (
        <div className="vendor-modal-backdrop">
          <div className="vendor-modal-card">
            <div className="vendor-modal-header">
              <div>
                <span className="vendor-modal-tag">SERVICE DETAILS</span>
                <h2>{editingService ? "Edit Service" : "Add New Service"}</h2>
              </div>

              <button
                type="button"
                className="vendor-close-button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="vendor-service-form">
              <div className="vendor-form-grid">
                <div className="vendor-field full">
                  <label htmlFor="serviceName">Service Name *</label>
                  <input
                    id="serviceName"
                    name="name"
                    type="text"
                    placeholder="e.g. Cinematic Wedding Highlights"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="vendor-field">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="">Select Category</option>
                    <option value="Photography">Photography</option>
                    <option value="Videography">Videography</option>
                    <option value="Catering">Catering</option>
                    <option value="Decoration">Decoration</option>
                    <option value="Music & Sound">Music & Sound</option>
                    <option value="Venue">Venue</option>
                    <option value="Transport">Transport</option>
                    <option value="Attire">Attire</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="vendor-field">
                  <label htmlFor="price">Price (₹) *</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    placeholder="e.g. 45000"
                    value={formData.price}
                    onChange={handleChange}
                  />
                </div>

                <div className="vendor-field">
                  <label htmlFor="location">Base Location *</label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="vendor-field">
                  <label htmlFor="serviceArea">Service Area</label>
                  <input
                    id="serviceArea"
                    name="serviceArea"
                    type="text"
                    placeholder="e.g. All South India"
                    value={formData.serviceArea}
                    onChange={handleChange}
                  />
                </div>

                <div className="vendor-field">
                  <label htmlFor="duration">Service Duration</label>
                  <input
                    id="duration"
                    name="duration"
                    type="text"
                    placeholder="e.g. Full Event / 6 Hours"
                    value={formData.duration}
                    onChange={handleChange}
                  />
                </div>

                <div className="vendor-field full">
                  <label htmlFor="description">Service Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Describe your service deliverables, special equipment, staff count..."
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="vendor-form-actions">
                <button
                  type="button"
                  className="vendor-secondary-button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="vendor-primary-button">
                  {editingService ? "Update Service" : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SERVICES LIST ================= */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#8B7355" }}>Loading services…</div>
      ) : services.length === 0 ? (
        <div className="vendor-empty-card">
          <div className="vendor-empty-icon">
            <PackageOpen size={30} />
          </div>
          <h3>No services added yet</h3>
          <p>
            Add your catering menus, photography packages, or decoration styles
            to begin receiving client booking requests.
          </p>
          <button className="vendor-primary-button" onClick={handleOpenAdd}>
            <Plus size={16} />
            Add First Service
          </button>
        </div>
      ) : (
        <div className="vendor-services-grid">
          {services.map((service) => {
            const sid = service._id || service.id;
            return (
              <div className="vendor-service-card" key={sid}>
                <div className="vendor-service-header">
                  <div>
                    <span className="vendor-service-category">
                      {service.category}
                    </span>
                    <h2>{service.name}</h2>
                  </div>

                  <div className="vendor-service-actions">
                    <button
                      type="button"
                      className="vendor-icon-button"
                      onClick={() => handleOpenEdit(service)}
                      title="Edit Service"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      type="button"
                      className="vendor-icon-button delete"
                      onClick={() => handleDelete(sid)}
                      title="Delete Service"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="vendor-service-price-row">
                  <span className="vendor-price-label">{service.priceType || "Pricing"}</span>
                  <span className="vendor-price-value">
                    <IndianRupee size={17} />
                    {Number(service.price || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <p className="vendor-service-description">
                  {service.description || "No description provided."}
                </p>

                <div className="vendor-service-meta">
                  <div className="vendor-meta-item">
                    <MapPin size={15} />
                    <span>{service.location || "Location not set"}</span>
                  </div>

                  <div className="vendor-meta-item">
                    <Clock size={15} />
                    <span>{service.duration || "Duration not set"}</span>
                  </div>
                </div>

                <div className="vendor-service-footer">
                  <span
                    className={`vendor-availability-pill ${
                      service.availability === "Available"
                        ? "available"
                        : "busy"
                    }`}
                  >
                    {service.availability || "Available"}
                  </span>

                  <span className="vendor-area-text">
                    Area: {service.serviceArea || "Local"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyServices;
