import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// AUTH
import Splash from "../pages/auth/Splash";
import RoleSelection from "../pages/auth/RoleSelection";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

// PUBLIC RSVP
import Rsvp from "../pages/public/Rsvp";

// ROUTE PROTECTION
import ProtectedRoute from "../components/common/ProtectedRoute";

// USER / ORGANIZER
import UserLayout from "../layouts/UserLayout";
import UserDashboard from "../pages/user/UserDashboard";
import CreateEvent from "../pages/user/CreateEvent";
import MyEvents from "../pages/user/MyEvents";
import EventDetails from "../pages/user/EventDetails";
import EventGuests from "../pages/user/EventGuests";
import BrowseVendors from "../pages/user/BrowseVendors";
import BookingsTracker from "../pages/user/BookingsTracker";
import BudgetTracker from "../pages/user/BudgetTracker";
import UserProfile from "../pages/user/UserProfile";
import AIFeaturesHub from "../pages/user/AIFeaturesHub";

// VENDOR
import VendorLayout from "../layouts/VendorLayout";
import VendorDashboard from "../pages/vendor/VendorDashboard";
import MyServices from "../pages/vendor/MyServices";
import EventRequests from "../pages/vendor/EventRequests";
import RequestDetails from "../pages/vendor/RequestDetails";
import SendProposal from "../pages/vendor/SendProposal";
import Bookings from "../pages/vendor/Bookings";
import Earnings from "../pages/vendor/Earnings";
import Reviews from "../pages/vendor/Reviews";
import Notifications from "../pages/vendor/Notifications";
import VendorProfile from "../pages/vendor/VendorProfile";
import VendorSettings from "../pages/vendor/VendorSettings";
import VendorAvailability from "../pages/vendor/VendorAvailability";

// VOLUNTEER
import VolunteerLayout from "../layouts/VolunteerLayout";
import VolunteerDashboard from "../pages/volunteer/VolunteerDashboard";
import AssignedTasks from "../pages/volunteer/AssignedTasks";
import MySchedule from "../pages/volunteer/MySchedule";
import VolunteerProfile from "../pages/volunteer/VolunteerProfile";

// ADMIN
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import ManageUsers from "../pages/admin/ManageUsers";
import ManageVendors from "../pages/admin/ManageVendors";
import ManageEvents from "../pages/admin/ManageEvents";
import ManageBookings from "../pages/admin/ManageBookings";
import ManageVolunteers from "../pages/admin/ManageVolunteers";
import ManagePayments from "../pages/admin/ManagePayments";
import PlatformReports from "../pages/admin/PlatformReports";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC AUTH & RSVP ROUTES */}
        <Route path="/" element={<Splash />} />
        <Route path="/roles" element={<RoleSelection />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/:role" element={<Register />} />
        <Route path="/rsvp/:token" element={<Rsvp />} />

        {/* 1. USER / ORGANIZER PORTAL */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={["user", "admin"]}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserDashboard />} />
          <Route path="events" element={<MyEvents />} />
          <Route path="events/create" element={<CreateEvent />} />
          <Route path="events/:id" element={<EventDetails />} />
          <Route path="events/:id/guests" element={<EventGuests />} />
          <Route path="vendors" element={<Navigate to="/user/bookings" replace />} />
          <Route path="bookings" element={<BookingsTracker />} />
          <Route path="budget" element={<BudgetTracker />} />
          <Route path="ai" element={<AIFeaturesHub />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>

        {/* 2. VENDOR PORTAL */}
        <Route
          path="/vendor"
          element={
            <ProtectedRoute allowedRoles={["vendor", "admin"]}>
              <VendorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<VendorDashboard />} />
          <Route path="services" element={<MyServices />} />
          <Route path="requests" element={<EventRequests />} />
          <Route path="requests/:id" element={<RequestDetails />} />
          <Route path="requests/:id/proposal" element={<SendProposal />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="availability" element={<VendorAvailability />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<VendorProfile />} />
          <Route path="settings" element={<VendorSettings />} />
        </Route>

        {/* 3. VOLUNTEER PORTAL */}
        <Route
          path="/volunteer"
          element={
            <ProtectedRoute allowedRoles={["volunteer", "admin"]}>
              <VolunteerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<VolunteerDashboard />} />
          <Route path="tasks" element={<AssignedTasks />} />
          <Route path="schedule" element={<MySchedule />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<VolunteerProfile />} />
        </Route>

        {/* 4. ADMIN PORTAL */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="vendors" element={<ManageVendors />} />
          <Route path="events" element={<ManageEvents />} />
          <Route path="bookings" element={<ManageBookings />} />
          <Route path="volunteers" element={<ManageVolunteers />} />
          <Route path="payments" element={<ManagePayments />} />
          <Route path="reports" element={<PlatformReports />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* UNKNOWN ROUTE WILDCARD */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
