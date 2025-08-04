import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit,
  Trash2,
  ArrowUpDown,
  Play,
  Pause,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { DataLoading } from "@/components/ui/loading-states";
import { portfolioStore } from "@/stores/PortfolioStore";
import { formatCurrency } from "@/lib/utils";
import { AddSIPModal } from "./AddSIPModal";

export const SIPsList = observer(() => {
  const [sortField, setSortField] = useState("fundName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [editingSIP, setEditingSIP] = useState(null);
  const [deletingSIP, setDeletingSIP] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { sips, loading, error } = portfolioStore;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedSIPs = [...sips].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle date fields
    if (sortField === "nextDueDate") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Handle numeric fields
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Handle string fields
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const handleEdit = (sip) => {
    setEditingSIP(sip);
    setShowEditModal(true);
  };

  const handleDelete = (sip) => {
    setDeletingSIP(sip);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (deletingSIP) {
      try {
        await portfolioStore.deleteSIP(deletingSIP.id);
        setShowDeleteDialog(false);
        setDeletingSIP(null);
      } catch (error) {
        console.error("Failed to delete SIP:", error);
      }
    }
  };

  const handleStatusChange = async (sip, newStatus) => {
    try {
      await portfolioStore.updateSIP(sip.id, { status: newStatus });
    } catch (error) {
      console.error("Failed to update SIP status:", error);
    }
  };

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success";
      case "paused":
        return "warning";
      case "completed":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Play className="h-3 w-3" />;
      case "paused":
        return <Pause className="h-3 w-3" />;
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDaysUntilDue = (dueDateString) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `${diffDays} days`;
  };

  const SortableHeader = ({ field, children }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </TableHead>
  );

  if (loading.sips) {
    return (
      <Card className="modern-card">
        <CardContent className="p-6">
          <DataLoading
            title="Loading SIPs..."
            description="Fetching your systematic investment plans"
          />
        </CardContent>
      </Card>
    );
  }

  if (error.sips) {
    return (
      <Card className="modern-card">
        <CardContent className="p-6">
          <ErrorState
            title="Failed to load SIPs"
            message={error.sips}
            type="error"
            actions={[
              {
                label: "Retry",
                onClick: () => window.location.reload(),
                icon: RefreshCw,
                variant: "default",
              },
            ]}
          />
        </CardContent>
      </Card>
    );
  }

  if (sips.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 space-y-2">
            <div className="text-muted-foreground">No SIPs found</div>
            <div className="text-sm text-muted-foreground">
              Add your first SIP to get started
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active SIPs ({sips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="fundName">Fund Name</SortableHeader>
                <SortableHeader field="amount">Amount</SortableHeader>
                <SortableHeader field="frequency">Frequency</SortableHeader>
                <SortableHeader field="nextDueDate">
                  Next Due Date
                </SortableHeader>
                <SortableHeader field="totalInstallments">
                  Installments
                </SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSIPs.map((sip) => {
                const progress =
                  sip.totalInstallments > 0
                    ? (sip.completedInstallments / sip.totalInstallments) * 100
                    : 0;

                return (
                  <TableRow key={sip.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>{sip.fundName}</div>
                        {sip.mutualFund && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            🔗 Linked to {sip.mutualFund.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(sip.amount || 0)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sip.frequency}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{formatDate(sip.nextDueDate)}</div>
                        <div className="text-sm text-muted-foreground">
                          {getDaysUntilDue(sip.nextDueDate)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>
                          {sip.completedInstallments || 0} /{" "}
                          {sip.totalInstallments || 0}
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={getStatusVariant(sip.status)}
                          className="flex items-center space-x-1"
                        >
                          {getStatusIcon(sip.status)}
                          <span>{sip.status}</span>
                        </Badge>
                        {sip.status === "Active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(sip, "Paused")}
                            title="Pause SIP"
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {sip.status === "Paused" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(sip, "Active")}
                            title="Resume SIP"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(sip)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sip)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <AddSIPModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        editingSIP={editingSIP}
        onClose={() => {
          setShowEditModal(false);
          setEditingSIP(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SIP</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the SIP for "
              {deletingSIP?.fundName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
