import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Search, ArrowLeft, Heart, AlertCircle, Droplet, Check, Plus, ChevronRight } from 'lucide-react';
import { storage } from '../utils/storage';


export function CattleRecordsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = storage.getUser();
  const [cattle] = useState(storage.getCattle());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>(location.state?.filter || 'all');

  const filters = [
    { id: 'all', label: 'All', count: cattle.length },
    { id: 'healthy', label: 'Healthy', count: cattle.filter((c) => c.status === 'healthy').length },
    { id: 'sick', label: 'Sick', count: cattle.filter((c) => c.status === 'sick').length },
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

    if (selectedFilter !== 'all') {
      result = result.filter((c) => c.status === selectedFilter);
    }

    if (searchQuery) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.breed.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [cattle, selectedFilter, searchQuery]);

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success rounded-md text-[14px] font-medium border border-success/20"><Heart className="w-[14px] h-[14px]" /> Healthy</span>;
      case 'sick':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 text-destructive rounded-md text-[14px] font-medium border border-destructive/20"><AlertCircle className="w-[14px] h-[14px]" /> Sick</span>;
      case 'lactating':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 text-secondary rounded-md text-[14px] font-medium border border-secondary/20"><Droplet className="w-[14px] h-[14px]" /> Lactating</span>;
      case 'vaccinated':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent rounded-md text-[14px] font-medium border border-accent/20"><Check className="w-[14px] h-[14px]" /> Vaccinated</span>;
      default:
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-[14px] font-medium border border-border">Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-card border-b border-[#E5E7EB] sticky top-0 z-30 transition-colors duration-150 ease-out">
        <div className="max-w-[1280px] mx-auto px-6 py-5 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-1 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-all duration-150 ease-out"
              >
                <ArrowLeft className="w-[20px] h-[20px]" />
              </button>
              <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">Cattle Records</h1>
            </div>
            {user?.role === 'manager' && (
              <button
                onClick={() => navigate('/cattle/add')}
                className="h-[48px] px-6 bg-[#1B5E20] text-white rounded-[10px] font-medium text-[14px] hover:bg-[#1B5E20]/90 transition-all duration-150 ease-out flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(27,94,32,0.15)] active:scale-98"
              >
                <Plus className="w-[18px] h-[18px]" />
                <span>Add Cattle</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or breed..."
              className="w-full h-[48px] pl-11 pr-4 bg-white border border-[#E5E7EB] rounded-[10px] text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-all duration-150 ease-out"
            />
          </div>
          
          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-[10px] overflow-x-auto scrollbar-hide max-w-max">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-[8px] text-[14px] font-semibold transition-all duration-150 ease-out ${
                  selectedFilter === filter.id
                    ? 'bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{filter.label}</span>
                <span className={`px-2 py-0.5 rounded-[6px] text-[12px] leading-none font-bold transition-all duration-150 ease-out ${
                  selectedFilter === filter.id ? 'bg-[#1B5E20]/10 text-[#1B5E20]' : 'bg-background/80 text-muted-foreground'
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 max-w-[1280px] mx-auto w-full">
        {filteredCattle.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-[48px] h-[48px] bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-[20px] h-[20px] text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold text-[18px] mb-1">No cattle found</p>
            <p className="text-[14px] text-muted-foreground font-medium">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="bg-card border border-[#E5E7EB] rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#E5E7EB] bg-muted/40 text-[14px] font-semibold text-muted-foreground tracking-tight">
              <div className="col-span-5">Name & ID</div>
              <div className="col-span-3">Breed & Age</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-[#E5E7EB]">
              {filteredCattle.map((animal, index) => (
                <motion.button
                  key={animal.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut', delay: 0.01 * index }}
                  onClick={() => navigate(`/cattle/profile/${animal.id}`)}
                  className="w-full flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 md:gap-4 px-6 py-5 hover:bg-muted/30 transition-colors duration-150 ease-out text-left group"
                >
                  <div className="col-span-5 flex items-center gap-4 min-w-0">
                    <div className="w-[40px] h-[40px] rounded-[10px] bg-background border border-[#E5E7EB] flex items-center justify-center font-semibold text-[16px] text-foreground flex-shrink-0 group-hover:border-[#1B5E20]/30 transition-colors duration-150 ease-out">
                      {animal.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[16px] font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-150 ease-out">
                        {animal.name}
                      </h4>
                      <p className="text-[14px] text-muted-foreground truncate font-mono mt-0.5">
                        {animal.id}
                      </p>
                    </div>
                  </div>
                  
                  <div className="col-span-3 hidden md:block">
                    <p className="text-[16px] text-foreground truncate">{animal.breed}</p>
                    <p className="text-[14px] text-muted-foreground">{animal.age} years</p>
                  </div>
                  
                  <div className="col-span-3 flex items-center">
                    {getStatusIndicator(animal.status)}
                  </div>
                  
                  <div className="col-span-1 hidden md:flex justify-end">
                    <ChevronRight className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-150 ease-out" />
                  </div>
                  
                  {/* Mobile details layout */}
                  <div className="flex items-center justify-between mt-2 md:hidden">
                    <p className="text-[14px] text-muted-foreground font-medium">
                      {animal.breed} • {animal.age} yrs
                    </p>
                    <ChevronRight className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-150 ease-out" />
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
