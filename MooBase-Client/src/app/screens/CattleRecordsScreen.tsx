import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import {
  Search,
  ArrowLeft,
  Heart,
  AlertCircle,
  Droplet,
  Check,
  Plus,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { storage } from '../utils/storage';

export function CattleRecordsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = storage.getUser();
  const [cattle] = useState(storage.getCattle());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>(location.state?.filter || 'all');

  const filters = [
    { id: 'all', label: 'All Herd', count: cattle.length },
    { id: 'female', label: 'Female ♀', count: cattle.filter((c) => c.gender === 'female' || !c.gender).length },
    { id: 'male', label: 'Male ♂', count: cattle.filter((c) => c.gender === 'male').length },
    { id: 'healthy', label: 'Healthy', count: cattle.filter((c) => c.status === 'healthy').length },
    { id: 'sick', label: 'Sick / Alert', count: cattle.filter((c) => c.status === 'sick').length },
    {
      id: 'vaccinated',
      label: 'Vaccinated',
      count: cattle.filter((c) => c.status === 'vaccinated').length,
    },
    {
      id: 'lactating',
      label: 'Lactating',
      count: cattle.filter((c) => c.status === 'lactating').length,
    },
  ];

  const filteredCattle = useMemo(() => {
    let result = cattle;

    if (selectedFilter === 'female') {
      result = result.filter((c) => c.gender === 'female' || !c.gender);
    } else if (selectedFilter === 'male') {
      result = result.filter((c) => c.gender === 'male');
    } else if (selectedFilter !== 'all') {
      result = result.filter((c) => c.status === selectedFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.breed.toLowerCase().includes(q) ||
          (c.tagNumber && c.tagNumber.toLowerCase().includes(q)) ||
          (c.gender && c.gender.toLowerCase().includes(q))
      );
    }

    return result;
  }, [cattle, selectedFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
            <Heart className="w-3 h-3 fill-emerald-600" /> Healthy
          </span>
        );
      case 'sick':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 animate-pulse">
            <AlertCircle className="w-3 h-3" /> Sick / Alert
          </span>
        );
      case 'lactating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
            <Droplet className="w-3 h-3 fill-blue-600" /> Lactating
          </span>
        );
      case 'vaccinated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200">
            <Check className="w-3 h-3 stroke-[3]" /> Vaccinated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-bold border border-border capitalize">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col font-sans">
      {/* Header Banner */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  Cattle Records
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Kayera Farm Herd Registry ({filteredCattle.length} of {cattle.length} cattle)
                </p>
              </div>
            </div>

            {user?.role === 'manager' && (
              <button
                onClick={() => navigate('/cattle/add')}
                className="h-10 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Cattle</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID tag, or breed (e.g. Friesian, Bella)..."
              className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex items-center text-xs font-semibold text-muted-foreground mr-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters:
            </div>
            {filters.map((filter) => {
              const isSelected = selectedFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cattle List Content */}
      <div className="flex-1 px-4 sm:px-6 py-6 max-w-[1240px] mx-auto w-full">
        {filteredCattle.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm max-w-md mx-auto my-8">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No Cattle Found</h3>
            <p className="text-xs text-muted-foreground font-medium mb-5">
              {searchQuery
                ? `No animals matched your search "${searchQuery}".`
                : 'No cattle records matching this filter.'}
            </p>
            {user?.role === 'manager' && (
              <button
                onClick={() => navigate('/cattle/add')}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Cattle</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4">Cattle ID & Name</div>
              <div className="col-span-3">Breed & Age</div>
              <div className="col-span-2">Gender</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">View</div>
            </div>

            {/* Cattle Rows */}
            <div className="divide-y divide-border">
              {filteredCattle.map((animal, index) => (
                <motion.button
                  key={animal.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, delay: Math.min(index * 0.02, 0.2) }}
                  onClick={() => navigate(`/cattle/profile/${animal.id}`)}
                  className="w-full flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 md:gap-4 px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors text-left group cursor-pointer"
                >
                  {/* Name & Tag */}
                  <div className="col-span-4 flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-base flex-shrink-0 group-hover:scale-105 transition-transform">
                      {animal.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {animal.name}
                      </h3>
                      <p className="text-xs font-mono font-semibold text-muted-foreground">
                        {animal.tagNumber || animal.id}
                      </p>
                    </div>
                  </div>

                  {/* Breed & Age */}
                  <div className="col-span-3 hidden md:block">
                    <p className="text-sm font-semibold text-foreground truncate">{animal.breed}</p>
                    <p className="text-xs text-muted-foreground font-medium">{animal.age} years old</p>
                  </div>

                  {/* Gender */}
                  <div className="col-span-2 hidden md:block">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                        animal.gender === 'male'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {animal.gender === 'male' ? '♂ Male' : '♀ Female'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 hidden md:flex items-center">
                    {getStatusBadge(animal.status)}
                  </div>

                  {/* Chevron Action */}
                  <div className="col-span-1 hidden md:flex justify-end">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Mobile Row Details */}
                  <div className="flex items-center justify-between mt-1 md:hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-semibold">
                        {animal.breed} • {animal.age} yrs
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          animal.gender === 'male'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {animal.gender === 'male' ? '♂' : '♀'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(animal.status)}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
