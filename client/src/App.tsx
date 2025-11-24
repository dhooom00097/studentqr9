import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TeacherDashboard from "./pages/TeacherDashboard";
import SessionDetails from "./pages/SessionDetails";
import StudentCheckIn from "./pages/StudentCheckIn";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherSettings from "./pages/TeacherSettings";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/teacher-login"} component={TeacherLogin} />
      <Route path={"/teacher"} component={TeacherDashboard} />
      <Route path={"/session/:id"} component={SessionDetails} />
      <Route path={"/checkin/:code"} component={StudentCheckIn} />
      <Route path={"/checkin"} component={StudentCheckIn} />
      <Route path={"/settings"} component={TeacherSettings} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
