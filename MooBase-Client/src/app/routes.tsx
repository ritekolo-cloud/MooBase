import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layouts/RootLayout";
import { AuthenticatedLayout } from "./components/layouts/AuthenticatedLayout";
import { SplashScreen } from "./screens/SplashScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "./screens/ResetPasswordScreen";
import { RoleSelectionScreen } from "./screens/RoleSelectionScreen";
import { ManagerDashboard } from "./screens/ManagerDashboard";
import { AttendantDashboard } from "./screens/AttendantDashboard";
import { CattleRecordsScreen } from "./screens/CattleRecordsScreen";
import { CattleProfileScreen } from "./screens/CattleProfileScreen";
import { AddRecordScreen } from "./screens/AddRecordScreen";
import { AddCattleScreen } from "./screens/AddCattleScreen";
import { AttendantsListScreen } from "./screens/AttendantsListScreen";
import { AddAttendantScreen } from "./screens/AddAttendantScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { OfflineSyncScreen } from "./screens/OfflineSyncScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ChangePasswordScreen } from "./screens/ChangePasswordScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { NotFoundScreen } from "./screens/NotFoundScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: SplashScreen },
      { path: "login", Component: LoginScreen },
      { path: "forgot-password", Component: ForgotPasswordScreen },
      { path: "reset-password", Component: ResetPasswordScreen },
      { path: "role-selection", Component: RoleSelectionScreen },
      {
        Component: AuthenticatedLayout,
        children: [
          { path: "manager/dashboard", Component: ManagerDashboard },
          { path: "attendant/dashboard", Component: AttendantDashboard },
          { path: "cattle", Component: CattleRecordsScreen },
          { path: "cattle/add", Component: AddCattleScreen },
          { path: "cattle/edit/:id", Component: AddCattleScreen },
          { path: "cattle/profile/:id", Component: CattleProfileScreen },
          { path: "records/add", Component: AddRecordScreen },
          { path: "records/edit/:id", Component: AddRecordScreen },
          { path: "users", Component: AttendantsListScreen },
          { path: "users/add", Component: AddAttendantScreen },
          { path: "users/edit/:id", Component: AddAttendantScreen },
          { path: "settings/attendants", Component: AttendantsListScreen },
          { path: "settings/add-attendant", Component: AddAttendantScreen },
          { path: "settings/edit-attendant/:id", Component: AddAttendantScreen },
          { path: "reports", Component: ReportsScreen },
          { path: "sync", Component: OfflineSyncScreen },
          { path: "settings", Component: SettingsScreen },
          { path: "settings/change-password", Component: ChangePasswordScreen },
          { path: "profile", Component: ProfileScreen },
        ],
      },
      { path: "*", Component: NotFoundScreen },
    ],
  },
]);

