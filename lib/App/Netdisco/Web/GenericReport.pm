package App::Netdisco::Web::GenericReport;

use Dancer ':syntax';
use Dancer::Plugin::Ajax;
use Dancer::Plugin::DBIC;
use Dancer::Plugin::Auth::Extensible;

use App::Netdisco::Web::Plugin;
use Path::Class 'file';
use Safe;

use vars qw/$config @data/;

foreach my $r (keys %{setting('reports')}) {
  my $report = setting('reports')->{$r};

  register_report({
    tag => $r,
    label => $report->{label},
    category => ($report->{category} || 'My Reports'),
    provides_csv => true,
  });

  get "/ajax/content/report/$r" => require_login sub {
      my $rs = schema('netdisco')->resultset('Virtual::GenericReport')->result_source;

      # TODO: this should be done by creating a new Virtual Result class on
      # the fly (package...) and then calling DBIC register_class on it.

      $rs->view_definition($report->{query});
      $rs->remove_columns($rs->columns);
      $rs->add_columns( exists $report->{query_columns}
        ? @{ $report->{query_columns} }
        : (map {keys %{$_}} @{$report->{columns}})
      );

      my $set = schema('netdisco')->resultset('Virtual::GenericReport')
        ->search(undef, {result_class => 'DBIx::Class::ResultClass::HashRefInflator'});
      @data = $set->all;

      # Data Munging support...

      my $compartment = Safe->new;
      $config = setting('reports')->{$r};
      $compartment->share(qw/$config @data/);
      $compartment->permit_only(qw/:default sort/);

      my $munger  = file(($ENV{NETDISCO_HOME} || $ENV{HOME}), 'site_plugins', $r)->stringify;
      my @results = ((-f $munger) ? $compartment->rdo( $munger ) : @data);
      return if $@ or (0 == scalar @results);

      if (request->is_ajax) {
          template 'ajax/report/generic_report.tt',
              { results => \@results,
                headings => [map {values %{$_}} @{$report->{columns}}],
                columns => [map {keys %{$_}} @{$report->{columns}}] },
              { layout => undef };
      }
      else {
          header( 'Content-Type' => 'text/comma-separated-values' );
          template 'ajax/report/generic_report_csv.tt',
              { results => \@results,
                headings => [map {values %{$_}} @{$report->{columns}}],
                columns => [map {keys %{$_}} @{$report->{columns}}] },
              { layout => undef };
      }
  };
}

true;
